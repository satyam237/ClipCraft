"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CommentForm } from "./CommentForm";
import { Button } from "@/components/ui/button";
import { MessageSquare, Check } from "lucide-react";

function formatTime(ms: number | null): string {
  if (ms == null) return "";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

type Comment = {
  id: string;
  video_id: string;
  user_id: string;
  timestamp_ms: number | null;
  body: string;
  parent_id: string | null;
  resolved: boolean;
  created_at: string;
};

export function CommentList({
  videoId,
  currentTimeMs,
  onSeek,
}: {
  videoId: string;
  currentTimeMs: number;
  onSeek?: (ms: number) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const fetchComments = async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("video_id", videoId)
        .order("created_at", { ascending: true });
      setComments((data as Comment[]) ?? []);
    };

    fetchComments();
    const channel = supabase
      .channel(`comments:${videoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `video_id=eq.${videoId}` },
        () => fetchComments()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId]);

  const topLevel = comments.filter((c) => !c.parent_id);
  const getReplies = (id: string) => comments.filter((c) => c.parent_id === id);

  const toggleResolved = async (id: string, resolved: boolean) => {
    const supabase = createClient();
    await supabase.from("comments").update({ resolved }).eq("id", id);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Comments
      </h3>
      <CommentForm
        videoId={videoId}
        currentTimeMs={currentTimeMs}
        onSubmitted={async () => {
          const supabase = createClient();
          const { data } = await supabase
            .from("comments")
            .select("*")
            .eq("video_id", videoId)
            .order("created_at", { ascending: true });
          setComments((data as Comment[]) ?? []);
        }}
      />
      <ul className="space-y-3">
        {topLevel.map((c) => (
          <li key={c.id} className="rounded-lg border border-[var(--border)] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  className="text-xs font-mono text-[var(--muted-foreground)] hover:underline"
                  onClick={() => c.timestamp_ms != null && onSeek?.(c.timestamp_ms)}
                >
                  {formatTime(c.timestamp_ms)}
                </button>
                <p className="mt-1 text-sm">{c.body}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                title={c.resolved ? "Unresolve" : "Resolve"}
                onClick={() => toggleResolved(c.id, !c.resolved)}
              >
                <Check className={`h-4 w-4 ${c.resolved ? "text-green-600" : ""}`} />
              </Button>
            </div>
            {getReplies(c.id).map((r) => (
              <div key={r.id} className="ml-4 mt-2 pl-2 border-l-2 border-[var(--border)]">
                <button
                  type="button"
                  className="text-xs font-mono text-[var(--muted-foreground)] hover:underline"
                  onClick={() => r.timestamp_ms != null && onSeek?.(r.timestamp_ms)}
                >
                  {formatTime(r.timestamp_ms)}
                </button>
                <p className="text-sm">{r.body}</p>
              </div>
            ))}
            {replyingTo === c.id ? (
              <div className="mt-2 ml-4">
                <CommentForm
                  videoId={videoId}
                  currentTimeMs={currentTimeMs}
                  parentId={c.id}
                  onSubmitted={() => { setReplyingTo(null); }}
                />
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 text-xs"
                onClick={() => setReplyingTo(c.id)}
              >
                Reply
              </Button>
            )}
          </li>
        ))}
      </ul>
      {topLevel.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)]">No comments yet.</p>
      )}
    </div>
  );
}
