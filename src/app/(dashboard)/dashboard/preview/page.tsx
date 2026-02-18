"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getChunksForSession, deleteSessionChunks } from "@/lib/recorder/recording-db";
import { useBackgroundUpload } from "@/hooks/useBackgroundUpload";
import { VideoPreviewLayout } from "@/components/preview/VideoPreviewLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatRecordingTitle(): string {
  const d = new Date();
  return `Recording – ${d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default function PreviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState(formatRecordingTitle());
  const [ownerName, setOwnerName] = useState("You");
  const [retryKey, setRetryKey] = useState(0);
  const blobUrlRef = useRef<string | null>(null);

  const { videoId, progress, progressInfo, status, creatingPhase, error: uploadError } =
    useBackgroundUpload(sessionId, retryKey);

  // Load recording from IndexedDB and create blob URL
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const chunks = await getChunksForSession(sessionId);
        if (cancelled) return;
        if (!chunks.length) {
          setLoadError("No recording data found for this session.");
          setLoading(false);
          return;
        }
        const blob = new Blob(chunks.map((c) => c.blob), { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setVideoUrl(url);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Failed to load recording preview."
          );
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [sessionId]);

  // Load current user profile for owner name
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && profile?.display_name) {
        setOwnerName(profile.display_name);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist title to video when videoId is available
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      if (!videoId) return;
      const supabase = createClient();
      supabase.from("videos").update({ title: newTitle }).eq("id", videoId).then();
    },
    [videoId]
  );

  const handleDelete = async () => {
    if (!sessionId) {
      router.push("/dashboard/record");
      return;
    }
    await deleteSessionChunks(sessionId);
    router.push("/dashboard/record");
  };

  if (!sessionId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>No recording session</CardTitle>
            <CardDescription>
              Start a new recording to see a preview and get a shareable link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard/record")}>
              New Recording
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Preparing preview…</CardTitle>
            <CardDescription>Your video will play in a moment.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loadError || !videoUrl) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Preview unavailable</CardTitle>
            <CardDescription>{loadError ?? "No recording to preview."}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={() => router.push("/dashboard/record")}>
              Record again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <VideoPreviewLayout
        videoUrl={videoUrl}
        title={title}
        onTitleChange={handleTitleChange}
        videoId={videoId}
        uploadStatus={status}
        uploadProgress={progress}
        uploadProgressInfo={progressInfo}
        uploadError={uploadError}
        creatingPhase={creatingPhase}
        onRetry={() => setRetryKey((k) => k + 1)}
        ownerName={ownerName}
        initialSummary=""
        onDelete={handleDelete}
      />
    </div>
  );
}
