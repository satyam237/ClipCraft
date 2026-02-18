"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function formatTimestamp(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) {
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function CommentForm({
  videoId,
  currentTimeMs,
  parentId,
  onSubmitted,
}: {
  videoId: string;
  currentTimeMs: number;
  parentId?: string | null;
  onSubmitted?: () => void;
}) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("comments").insert({
      video_id: videoId,
      user_id: user.id,
      timestamp_ms: currentTimeMs || null,
      body: body.trim(),
      parent_id: parentId ?? null,
    });
    setLoading(false);
    if (!error) {
      setBody("");
      onSubmitted?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <span className="text-xs text-[var(--muted-foreground)] self-center">
        {formatTimestamp(currentTimeMs)}
      </span>
      <Input
        placeholder={parentId ? "Reply…" : "Add a comment…"}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={loading}
        className="flex-1"
      />
      <Button type="submit" disabled={loading || !body.trim()}>
        {parentId ? "Reply" : "Comment"}
      </Button>
    </form>
  );
}
