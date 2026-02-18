"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type AnalyticsEventType = "view" | "play" | "pause" | "seek" | "complete";

export function useAnalytics(videoId: string) {
  const track = useCallback(
    async (eventType: AnalyticsEventType, payload?: Record<string, unknown>) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("analytics_events").insert({
        video_id: videoId,
        viewer_id: user?.id ?? null,
        event_type: eventType,
        payload: payload ?? null,
      });
    },
    [videoId]
  );

  return { track };
}
