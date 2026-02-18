"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TrimEditor({
  videoSrc,
  durationSec,
  onExport,
}: {
  videoSrc: string;
  durationSec: number;
  onExport: (startSec: number, endSec: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(durationSec);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const duration = durationSec || 1;
  const startPct = (start / duration) * 100;
  const endPct = (end / duration) * 100;

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const t = pct * duration;
    if (Math.abs(t - start) < Math.abs(t - end)) setStart(Math.max(0, Math.min(t, end - 0.5)));
    else setEnd(Math.min(duration, Math.max(t, start + 0.5)));
  };

  const handleMouseDown = (which: "start" | "end") => () => setDragging(which);
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const t = pct * duration;
      if (dragging === "start") setStart(Math.max(0, Math.min(t, end - 0.5)));
      else setEnd(Math.min(duration, Math.max(t, start + 0.5)));
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, duration, start, end]);

  const handlePreview = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = start;
      videoRef.current.play();
      const stopAt = () => {
        if (videoRef.current && videoRef.current.currentTime >= end) {
          videoRef.current.pause();
          videoRef.current.removeEventListener("timeupdate", stopAt);
        }
      };
      videoRef.current.addEventListener("timeupdate", stopAt);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trim</CardTitle>
        <CardDescription>
          Set start and end. Export creates a new version (non-destructive).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="aspect-video max-w-xl overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            className="h-full w-full"
            onLoadedMetadata={(e) => {
              const d = (e.target as HTMLVideoElement).duration;
              if (d && !durationSec) {
                setEnd(d);
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm text-[var(--muted-foreground)]">
            Start: {start.toFixed(1)}s — End: {end.toFixed(1)}s
          </p>
          <div
            ref={trackRef}
            className="relative h-10 w-full cursor-pointer rounded bg-[var(--muted)]"
            onClick={handleTrackClick}
          >
            <div
              className="absolute inset-y-0 rounded bg-[var(--primary)] opacity-80"
              style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-2 cursor-ew-resize rounded-l bg-[var(--foreground)]"
              style={{ left: `${startPct}%` }}
              onMouseDown={handleMouseDown("start")}
            />
            <div
              className="absolute top-0 bottom-0 w-2 cursor-ew-resize rounded-r bg-[var(--foreground)]"
              style={{ left: `${endPct}%`, transform: "translateX(-100%)" }}
              onMouseDown={handleMouseDown("end")}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreview}>
            Preview
          </Button>
          <Button
            onClick={() => {
              if (start >= end) return;
              onExport(start, end);
            }}
          >
            Export trimmed version
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
