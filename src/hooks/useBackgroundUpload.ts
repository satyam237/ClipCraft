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

  useEffect(() => {
    if (!sessionId) return;

    if (retryKey !== undefined && retryKey !== lastRetryKeyRef.current) {
      lastRetryKeyRef.current = retryKey;
      startedRef.current = false;
    }

    if (startedRef.current) return;

    let cancelled = false;
    startedRef.current = true;
    setError(null);
    setStatus("creating");
    setCreatingPhase("workspace");

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        if (!cancelled) {
          setError(`Sign-in error: ${userError.message}`);
          setStatus("error");
          setCreatingPhase(null);
        }
        return;
      }
      if (!user) {
        if (!cancelled) {
          setError("You must be signed in to save this recording.");
          setStatus("error");
          setCreatingPhase(null);
        }
        return;
      }

      let workspaceId: string | undefined;
      const { data: workspaces, error: workspaceListError } = await supabase
        .from("workspaces")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1);

      if (workspaceListError) {
        if (!cancelled) {
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
          .single();

        if (createWorkspaceError || !createdWorkspace) {
          if (!cancelled) {
            setError(
              `Create workspace: ${createWorkspaceError?.message ?? "Failed to create a workspace"}`
            );
            setStatus("error");
            setCreatingPhase(null);
          }
          return;
        }
        workspaceId = createdWorkspace.id;

        const { error: memberError } = await supabase.from("workspace_members").insert({
          workspace_id: workspaceId,
          user_id: user.id,
          role: "owner",
        });
        if (memberError && !/duplicate key value|already exists/i.test(memberError.message)) {
          if (!cancelled) {
            setError(`Workspace member: ${memberError.message}`);
            setStatus("error");
            setCreatingPhase(null);
          }
          return;
        }
      }

      if (!cancelled) setCreatingPhase("video");

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
        .single();

      if (videoError || !video) {
        if (!cancelled) {
          setError(`Create video: ${videoError?.message ?? "Failed to create video"}`);
          setStatus("error");
          setCreatingPhase(null);
        }
        return;
      }

      if (cancelled || !workspaceId) return;
      setVideoId(video.id);
      setStatus("uploading");
      setCreatingPhase(null);

      try {
        const { path } = await uploadRecording(sessionId, video.id, workspaceId, (p) => {
          if (cancelled) return;
          setProgress(p.percent);
          setProgressInfo(p);
        });

        if (cancelled) return;

        const { error: assetError } = await supabase.from("video_assets").insert({
          video_id: video.id,
          asset_type: "raw_webm",
          storage_path: path,
        });
        if (assetError) {
          throw new Error(`Failed to save video asset: ${assetError.message}`);
        }

        const { error: jobsError } = await supabase.from("processing_jobs").insert([
          { video_id: video.id, job_type: "transcribe", status: "pending" },
          { video_id: video.id, job_type: "thumbnail", status: "pending" },
        ]);
        if (jobsError) {
          console.warn("Failed to create processing jobs:", jobsError);
        }

        const { error: videoUpdateError } = await supabase
          .from("videos")
          .update({ status: "processing" })
          .eq("id", video.id);
        if (videoUpdateError) {
          throw new Error(`Failed to update video status: ${videoUpdateError.message}`);
        }

        if (!cancelled) {
          setProgress(100);
          setStatus("done");
        }

        supabase.functions
          .invoke("transcribe", { body: { video_id: video.id } })
          .then((result) => {
            if (result.error) {
              console.error("Transcribe function error:", result.error);
              supabase
                .from("processing_jobs")
                .update({ status: "failed", error_log: result.error.message })
                .eq("video_id", video.id)
                .eq("job_type", "transcribe")
                .then();
            }
          })
          .catch((err) => {
            console.error("Failed to invoke transcribe:", err);
            supabase
              .from("processing_jobs")
              .update({ status: "failed", error_log: err.message })
              .eq("video_id", video.id)
              .eq("job_type", "transcribe")
              .then();
          });
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage.startsWith("Upload failed") ? errorMessage : `Upload failed: ${errorMessage}`);
          setStatus("error");
          console.error("Upload error:", err);
          supabase.from("videos").update({ status: "failed" }).eq("id", video.id).then();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, retryKey]);

  return { videoId, progress, progressInfo, status, creatingPhase, error };
}
