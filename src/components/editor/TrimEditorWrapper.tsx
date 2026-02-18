"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrimEditor } from "./TrimEditor";

export function TrimEditorWrapper({
  videoId,
  videoSrc,
  durationSec,
}: {
  videoId: string;
  videoSrc: string;
  durationSec: number;
}) {
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async (startSec: number, endSec: number) => {
    const supabase = createClient();
    await supabase.from("processing_jobs").insert({
      video_id: videoId,
      job_type: "transcode",
      status: "pending",
    });
    setMessage("Trim export queued. A new version will appear when processing completes.");
  };

  return (
    <div className="space-y-4">
      <TrimEditor
        videoSrc={videoSrc}
        durationSec={durationSec}
        onExport={handleExport}
      />
      {message && (
        <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
      )}
    </div>
  );
}
