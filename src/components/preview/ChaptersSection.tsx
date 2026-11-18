"use client";

import { useState } from "react";
import { Info } from "lucide-react";

export function ChaptersSection() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-medium text-foreground">Chapters</h3>
        <div className="relative">
          <button
            type="button"
            title="Add chapters to break your video into sections"
            className="rounded p-0.5 text-(--muted-foreground) hover:text-foreground"
            onClick={() => setShowInfo((v) => !v)}
          >
            <Info className="h-4 w-4" />
          </button>
          {showInfo && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowInfo(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-(--border) bg-(--card) p-3 text-xs text-(--muted-foreground) shadow-lg backdrop-blur-sm">
                Chapters let viewers jump between sections of your video. This feature is coming soon.
              </div>
            </>
          )}
        </div>
        <span className="rounded-full bg-(--muted) px-2 py-0.5 text-[10px] font-medium text-(--muted-foreground)">
          Coming soon
        </span>
      </div>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-(--border) bg-transparent px-3 py-2 text-sm text-(--muted-foreground) cursor-not-allowed opacity-60"
        disabled
      >
        + Add chapters
      </button>
    </section>
  );
}
