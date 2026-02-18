"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function SummarySection({
  videoId,
  initialSummary,
  disabled,
}: {
  videoId: string | null;
  initialSummary: string;
  disabled?: boolean;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [saving, setSaving] = useState(false);

  const saveSummary = useCallback(async (value: string) => {
    if (!videoId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("videos").update({ description: value || null }).eq("id", videoId);
    setSaving(false);
  }, [videoId]);

  const handleBlur = () => {
    saveSummary(summary);
  };

  if (!videoId) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Summary</h3>
        <textarea
          readOnly
          placeholder="Add a summary…"
          className="min-h-[80px] w-full resize-y rounded-md border border-(--border) bg-(--muted)/30 px-3 py-2 text-sm placeholder:text-(--muted-foreground)"
          value={summary}
        />
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">Summary</h3>
      <textarea
        placeholder="Add a summary…"
        disabled={disabled}
        className="min-h-[80px] w-full resize-y rounded-md border border-(--border) bg-background px-3 py-2 text-sm placeholder:text-(--muted-foreground) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        onBlur={handleBlur}
      />
      {saving && (
        <p className="text-xs text-(--muted-foreground)">Saving…</p>
      )}
    </section>
  );
}
