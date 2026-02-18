"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Download, ChevronDown } from "lucide-react";
import { ShareSettingsModal } from "@/components/player/ShareSettingsModal";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function VideoPlayer({
  src,
  videoId,
  title,
  duration,
  captionUrl,
  onTimeUpdate,
  videoRef,
  onPlay,
  onPause,
  onComplete,
  allowDownload = true,
}: {
  src: string;
  videoId: string;
  title: string;
  duration: number | null;
  captionUrl?: string | null;
  onTimeUpdate?: (currentTimeMs: number) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (timeMs: number) => void;
  onComplete?: () => void;
  allowDownload?: boolean;
}) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const setRef = (el: HTMLVideoElement | null) => {
    (internalRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    if (videoRef && "current" in videoRef)
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
  };
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const applySpeed = (s: number) => {
    setSpeed(s);
    if (internalRef.current) internalRef.current.playbackRate = s;
    setShowSpeedMenu(false);
  };

  const downloadUrl = `/api/videos/${videoId}/download`;

  return (
    <div className="space-y-2">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        <video
          ref={setRef}
          className="h-full w-full"
          src={src}
          controls
          playsInline
          onRateChange={(e) => setSpeed((e.target as HTMLVideoElement).playbackRate)}
          onTimeUpdate={(e) => onTimeUpdate?.(Math.round((e.target as HTMLVideoElement).currentTime * 1000))}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onComplete}
        >
          {captionUrl && (
            <track kind="captions" src={captionUrl} srcLang="en" label="English" default />
          )}
        </video>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSpeedMenu((v) => !v)}
          >
            {speed}x
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
          {showSpeedMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSpeedMenu(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-1 rounded-md border border-[var(--border)] bg-[var(--card)] p-1 shadow-md">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-[var(--accent)]"
                    onClick={() => applySpeed(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 className="mr-1 h-4 w-4" />
          Share
        </Button>
        {allowDownload && (
          <Button variant="outline" size="sm" asChild>
            <a href={downloadUrl} download>
              <Download className="mr-1 h-4 w-4" />
              Download
            </a>
          </Button>
        )}
      </div>
      <ShareSettingsModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        videoId={videoId}
        title={title}
      />
    </div>
  );
}
