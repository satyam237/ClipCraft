import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: video, error } = await supabase
    .from("videos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !video) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{video.title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/videos/${id}/analytics`}>Analytics</Link>
          </Button>
          <Button asChild>
            <Link href={`/videos/${id}/edit`}>Edit</Link>
          </Button>
          <Button asChild>
            <Link href={`/watch/${id}`}>Watch</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-[var(--muted-foreground)]">Status:</span> {video.status}</p>
          <p><span className="text-[var(--muted-foreground)]">Duration:</span> {video.duration != null ? `${Math.floor(video.duration / 60)}:${String(Math.floor(video.duration % 60)).padStart(2, "0")}` : "—"}</p>
          <p><span className="text-[var(--muted-foreground)]">Visibility:</span> {video.visibility}</p>
        </CardContent>
      </Card>
    </div>
  );
}
