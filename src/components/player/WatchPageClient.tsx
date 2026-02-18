"use client";

import { useState, useRef, useEffect } from "react";
import { VideoPlayer } from "./VideoPlayer";
import { useAnalytics } from "@/hooks/useAnalytics";
import { TranscriptPanel } from "./TranscriptPanel";
import { CommentList } from "@/components/comments/CommentList";
import { ReactionBar } from "@/components/comments/ReactionBar";

export function WatchPageClient({
  videoUrl,
  videoId,
  title,
  duration,
  captionUrl,
  transcriptText,
  isProcessing,
  allowDownload = true,
}: {
  videoUrl: string;
  videoId: string;
  title: string;
  duration: number | null;
  captionUrl: string | null;
  transcriptText: string | null;
  isProcessing: boolean;
  allowDownload?: boolean;
}) {
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const { track } = useAnalytics(videoId);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (viewTracked.current) return;
    viewTracked.current = true;
    track("view");
  }, [track]);

  const handleSeek = (ms: number) => {
    setCurrentTimeMs(ms);
    track("seek", { time_ms: ms });
    if (videoElRef.current) videoElRef.current.currentTime = ms / 1000;
  };

  return (
    <>
      {videoUrl && (
        <VideoPlayer
          src={videoUrl}
          videoId={videoId}
          title={title}
          duration={duration}
          captionUrl={captionUrl}
          onTimeUpdate={setCurrentTimeMs}
          videoRef={videoElRef}
          onPlay={() => track("play")}
          onPause={() => track("pause")}
          onComplete={() => track("complete")}
          allowDownload={allowDownload}
        />
      )}
      <div className="mt-4 flex items-center gap-4">
        <ReactionBar videoId={videoId} />
      </div>
      <div className="mt-6">
        <TranscriptPanel
          transcript={transcriptText}
          isProcessing={isProcessing}
          onSeek={(time) => handleSeek(time * 1000)}
        />
      </div>
      <div className="mt-6">
        <CommentList
          videoId={videoId}
          currentTimeMs={currentTimeMs}
          onSeek={handleSeek}
        />
      </div>
    </>
  );
}
