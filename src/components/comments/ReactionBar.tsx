"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";

const DEFAULT_EMOJIS = ["❤️", "👍", "🔥", "👏", "🙌", "👀", "😮", "💯"];
const MORE_EMOJIS = ["😂", "🎉", "✨", "🚀", "💡", "👎"];

export function ReactionBar({ videoId }: { videoId: string }) {
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchReactions = async () => {
    const { data } = await supabase
      .from("reactions")
      .select("emoji")
      .eq("video_id", videoId);
    const counts: Record<string, number> = {};
    (data ?? []).forEach((r: { emoji: string }) => {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    });
    setReactions(counts);
  };

  useEffect(() => {
    fetchReactions();
    const channel = supabase
      .channel(`reactions:${videoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions", filter: `video_id=eq.${videoId}` },
        fetchReactions
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addReaction = async (emoji: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserReaction(emoji);
    setShowPicker(false);
    await supabase.from("reactions").insert({
      video_id: videoId,
      user_id: user.id,
      emoji,
      timestamp_ms: null,
    });
  };

  const allEmojis = [...DEFAULT_EMOJIS];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allEmojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => addReaction(emoji)}
          className={`rounded-md border px-2 py-1 text-sm transition-colors ${userReaction === emoji
            ? "border-(--primary) bg-(--accent)"
            : "border-(--border) hover:bg-(--accent)"
            }`}
        >
          {emoji} {reactions[emoji] ?? 0}
        </button>
      ))}
      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="rounded-md border border-(--border) px-2 py-1 text-sm hover:bg-(--accent)"
          title="Add reaction"
        >
          <Plus className="h-4 w-4" />
        </button>
        {showPicker && (
          <div className="absolute left-0 top-full z-20 mt-1 flex flex-wrap gap-1 rounded-md border border-(--border) bg-(--card) p-2 shadow-md">
            {MORE_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addReaction(emoji)}
                className={`rounded px-1.5 py-0.5 text-sm hover:bg-(--accent) ${userReaction === emoji ? "bg-(--accent)" : ""}`}
              >
                {emoji} {reactions[emoji] ?? 0}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
