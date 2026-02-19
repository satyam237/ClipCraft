"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadRecording, type UploadProgress } from "@/lib/upload/chunked-upload";

export type UploadStatus = "idle" | "creating" | "uploading" | "done" | "error";

export type CreatingPhase = "workspace" | "video" | null;

export interface UseBackgroundUploadResult {
  videoId: string | null;
  progress: number;
  progressInfo: UploadProgress | null;
  status: UploadStatus;
  creatingPhase: CreatingPhase;
  error: string | null;
}

/**
 * Runs workspace + video creation and recording upload in the background.
 * Call with sessionId from the preview page; video plays from local blob immediately.
 * Returns videoId as soon as the DB record is created so the share link can be shown.
 * Pass retryKey and increment it to retry after a failure (e.g. user clicks "Retry save").
 */
export function useBackgroundUpload(
  sessionId: string | null,
  retryKey?: number
): UseBackgroundUploadResult {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressInfo, setProgressInfo] = useState<UploadProgress | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [creatingPhase, setCreatingPhase] = useState<CreatingPhase>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const lastRetryKeyRef = useRef<number | undefined>(undefined);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!sessionId) return;

    if (retryKey !== undefined && retryKey !== lastRetryKeyRef.current) {
      lastRetryKeyRef.current = retryKey;
      startedRef.current = false;
    }

    if (startedRef.current) return;

    let cancelled = false;
    isMountedRef.current = true;
    startedRef.current = true;
    if (isMountedRef.current) {
      setError(null);
      setStatus("creating");
      setCreatingPhase("workspace");
    }

    (async () => {
      const supabase = createClient();
      let createdVideoId: string | undefined;

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          if (isMountedRef.current && !cancelled) {
            setError(`Sign-in error: ${userError.message}`);
            setStatus("error");
            setCreatingPhase(null);
          }
          return;
        }
        if (!user) {
          if (isMountedRef.current && !cancelled) {
            setError("You must be signed in to save this recording.");
            setStatus("error");
            setCreatingPhase(null);
          }
          return;
        }

        let workspaceId: string | undefined;

        const { data: profile } = await supabase
          .from("profiles")
          .select("preferences")
          .eq("id", user.id)
          .maybeSingle();

        const prefs = (profile?.preferences as { default_workspace_id?: string | null }) ?? {};
        if (prefs.default_workspace_id && typeof prefs.default_workspace_id === "string") {
          const { data: defaultWs } = await supabase
            .from("workspaces")
            .select("id")
            .eq("id", prefs.default_workspace_id)
            .maybeSingle();
          if (defaultWs?.id) workspaceId = defaultWs.id;
        }

        if (!workspaceId) {
          const { data: workspaces, error: workspaceListError } = await supabase
            .from("workspaces")
            .select("id")
            .order("created_at", { ascending: false })
            .limit(1);

          if (workspaceListError) {
            if (isMountedRef.current && !cancelled) {
              setError(`Workspace list: ${workspaceListError.message}`);
              setStatus("error");
              setCreatingPhase(null);
            }
            return;
          }

          workspaceId = workspaces?.[0]?.id;
          if (!workspaceId) {
            const { data: createdWorkspace, error: createWorkspaceError } = await supabase
              .from("workspaces")
              .insert({ name: "My Workspace", owner_id: user.id })
              .select("id")
              .maybeSingle();

            if (createWorkspaceError || !createdWorkspace?.id) {
              if (isMountedRef.current && !cancelled) {
                setError(
                  `Create workspace: ${createWorkspaceError?.message ?? "Failed to create a workspace"}`
                );
                setStatus("error");
                setCreatingPhase(null);
              }
              return;
            }
            workspaceId = createdWorkspace.id;
          }
        }

        if (isMountedRef.current && !cancelled) setCreatingPhase("video");

        const { data: video, error: videoError } = await supabase
          .from("videos")
          .insert({
            workspace_id: workspaceId,
            owner_id: user.id,
            title: "Recording",
            status: "uploading",
            visibility: "unlisted",
          })
          .select("id")
          .maybeSingle();

        if (videoError || !video?.id) {
          if (isMountedRef.current && !cancelled) {
            setError(`Create video: ${videoError?.message ?? "Failed to create video"}`);
            setStatus("error");
            setCreatingPhase(null);
          }
          return;
        }

        createdVideoId = video.id;
        if (cancelled || !workspaceId) return;
        if (isMountedRef.current && !cancelled) {
          setVideoId(createdVideoId);
          setStatus("uploading");
          setCreatingPhase(null);
        }

        const { path } = await uploadRecording(sessionId, createdVideoId, workspaceId, (p) => {
          if (cancelled) return;
          if (isMountedRef.current) {
            setProgress(p.percent);
            setProgressInfo(p);
          }
        });

        if (cancelled) return;

        const { error: assetError } = await supabase.from("video_assets").insert({
          video_id: createdVideoId,
          asset_type: "raw_webm",
          storage_path: path,
        });
        if (assetError) {
          throw new Error(`Failed to save video asset: ${assetError.message}`);
        }

        const { error: jobsError } = await supabase.from("processing_jobs").insert([
          { video_id: createdVideoId, job_type: "transcribe", status: "pending" },
          { video_id: createdVideoId, job_type: "thumbnail", status: "pending" },
        ]);
        if (jobsError) {
          console.warn("Failed to create processing jobs:", jobsError);
        }

        const { error: videoUpdateError } = await supabase
          .from("videos")
          .update({ status: "processing" })
          .eq("id", createdVideoId);
        if (videoUpdateError) {
          throw new Error(`Failed to update video status: ${videoUpdateError.message}`);
        }

        if (isMountedRef.current) {
          setProgress(100);
          setStatus("done");
        }

        supabase.functions
          .invoke("transcribe", { body: { video_id: createdVideoId } })
          .then((result) => {
            if (result.error) {
              supabase
                .from("processing_jobs")
                .update({ status: "failed", error_log: result.error.message })
                .eq("video_id", createdVideoId)
                .eq("job_type", "transcribe")
                .then();
            }
          })
          .catch(() => {
            supabase
              .from("processing_jobs")
              .update({ status: "failed", error_log: "Edge function unavailable" })
              .eq("video_id", createdVideoId)
              .eq("job_type", "transcribe")
              .then();
          });
      } catch (err) {
        if (isMountedRef.current && !cancelled) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(
            errorMessage.includes("Refresh Token") || errorMessage.includes("refresh_token")
              ? "Your session expired. Please sign in again to save."
              : errorMessage
          );
          setStatus("error");
          setCreatingPhase(null);
          console.error("Save recording error:", err);
          if (createdVideoId) {
            supabase.from("videos").update({ status: "failed" }).eq("id", createdVideoId).then();
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      isMountedRef.current = false;
    };
  }, [sessionId, retryKey]);

  return { videoId, progress, progressInfo, status, creatingPhase, error };
}
