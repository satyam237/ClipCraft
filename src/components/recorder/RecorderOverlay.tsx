"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Square, Play } from "lucide-react";
import { useRecorderStore } from "@/stores/recorder-store";

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) {
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function RecorderOverlay({
  onStop,
  isPaused,
  onPause,
  onResume,
}: {
  onStop: () => void;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
}) {
  const { startTime, pausedDurationMs, pauseStart } = useRecorderStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      const base = Date.now();
      const effectiveNow =
        isPaused && pauseStart ? pauseStart : base;
      setElapsed(effectiveNow - startTime - pausedDurationMs);
    }, 500);
    return () => clearInterval(interval);
  }, [startTime, pausedDurationMs, isPaused, pauseStart]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-(--border) bg-(--card) px-4 py-2 shadow-lg">
      <span className="min-w-16 font-mono text-sm tabular-nums text-red-500">
        ● {formatTime(elapsed)}
      </span>
      {isPaused ? (
        <Button size="icon" variant="outline" onClick={onResume}>
          <Play className="h-4 w-4" />
        </Button>
      ) : (
        <Button size="icon" variant="outline" onClick={onPause}>
          <Pause className="h-4 w-4" />
        </Button>
      )}
      <Button size="icon" variant="destructive" onClick={onStop}>
        <Square className="h-4 w-4" />
      </Button>
    </div>
  );
}
