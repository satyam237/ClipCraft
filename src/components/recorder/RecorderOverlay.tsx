"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Square, Play, RotateCcw } from "lucide-react";
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
  onRestart,
  isPaused,
  onPause,
  onResume,
}: {
  onStop: () => void;
  onRestart: () => void;
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
    <div className="fixed left-4 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2 rounded-lg border border-(--border) bg-(--card) px-3 py-2 shadow-lg">
      <span className="min-w-14 text-center font-mono text-sm tabular-nums text-red-500">
        ● {formatTime(elapsed)}
      </span>
      {isPaused ? (
        <Button size="icon" variant="outline" onClick={onResume} title="Resume">
          <Play className="h-4 w-4" />
        </Button>
      ) : (
        <Button size="icon" variant="outline" onClick={onPause} title="Pause">
          <Pause className="h-4 w-4" />
        </Button>
      )}
      <Button size="icon" variant="destructive" onClick={onStop} title="Stop">
        <Square className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="outline" onClick={onRestart} title="Restart">
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
