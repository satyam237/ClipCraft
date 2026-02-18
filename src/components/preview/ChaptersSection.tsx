"use client";

import { Info } from "lucide-react";

export function ChaptersSection() {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-medium text-foreground">Chapters</h3>
        <button
          type="button"
          title="Add chapters to break your video into sections"
          className="rounded p-0.5 text-(--muted-foreground) hover:text-foreground"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md border border-dashed border-(--border) bg-transparent px-3 py-2 text-sm text-(--muted-foreground) hover:border-(--input) hover:bg-(--muted)/30 hover:text-foreground"
      >
        + Add chapters
      </button>
    </section>
  );
}
