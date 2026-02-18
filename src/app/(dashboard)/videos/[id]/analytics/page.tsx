import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoAnalyticsCharts } from "@/components/analytics/VideoAnalyticsCharts";

export default async function VideoAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: video, error } = await supabase
    .from("videos")
    .select("id, title")
    .eq("id", id)
    .single();

  if (error || !video) redirect("/dashboard");

  const { data: events } = await supabase
    .from("analytics_events")
    .select("event_type, payload, created_at, viewer_id")
    .eq("video_id", id)
    .order("created_at", { ascending: false })
    .limit(500);

  const views = events?.filter((e) => e.event_type === "view").length ?? 0;
  const uniqueViewers = new Set(events?.map((e) => e.viewer_id).filter(Boolean)).size;
  const completes = events?.filter((e) => e.event_type === "complete").length ?? 0;
  const avgWatchPct = views > 0 ? Math.round((completes / views) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics: {video.title}</h1>
        <Button variant="outline" asChild>
          <Link href={`/videos/${id}`}>Back</Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{views}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Unique viewers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{uniqueViewers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Completions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{completes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Avg watch %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgWatchPct}%</p>
          </CardContent>
        </Card>
      </div>
      <VideoAnalyticsCharts events={events ?? []} />
    </div>
  );
}
