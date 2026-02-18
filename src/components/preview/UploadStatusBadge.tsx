"use client";

import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { UploadStatus, CreatingPhase } from "@/hooks/useBackgroundUpload";
import type { UploadProgress } from "@/lib/upload/chunked-upload";

function creatingLabel(phase: CreatingPhase): string {
  if (phase === "workspace") return "Creating workspace…";
  if (phase === "video") return "Creating video…";
  return "Preparing…";
}

export function UploadStatusBadge({
  status,
  progress,
  progressInfo,
  creatingPhase = null,
}: {
  status: UploadStatus;
  progress: number;
  progressInfo: UploadProgress | null;
  creatingPhase?: CreatingPhase;
}) {
  if (status === "idle" || status === "creating") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-(--border) bg-(--muted)/50 px-2.5 py-1 text-xs text-(--muted-foreground)">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {creatingLabel(creatingPhase)}
      </span>
    );
  }

  if (status === "uploading") {
    const label =
      progressInfo?.phase === "combining"
        ? "Preparing…"
        : progressInfo?.phase === "verifying" || progressInfo?.phase === "done"
          ? "Finalizing…"
          : "Uploading…";
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-(--border) bg-(--muted)/50 px-2.5 py-1 text-xs text-(--muted-foreground)">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {label} {progress < 100 ? `${progress}%` : ""}
      </span>
    );
  }

  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Ready
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-700 dark:text-red-400">
        <AlertCircle className="h-3.5 w-3.5" />
        Upload failed
      </span>
    );
  }

  return null;
}
