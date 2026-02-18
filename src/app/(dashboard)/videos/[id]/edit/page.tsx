import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSignedUrl } from "@/lib/supabase/storage";
import { TrimEditorWrapper } from "@/components/editor/TrimEditorWrapper";

export default async function VideoEditPage({
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

  if (error || !video) redirect("/dashboard");

  const { data: assets } = await supabase
    .from("video_assets")
    .select("asset_type, storage_path")
    .eq("video_id", id);
  const rawAsset = assets?.find((a) => a.asset_type === "raw_webm");
  const mp4Asset = assets?.find((a) => a.asset_type === "mp4");
  const playablePath = mp4Asset?.storage_path ?? rawAsset?.storage_path;
  const videoSrc = playablePath ? await getSignedUrl(playablePath) : null;
  const durationSec = video.duration != null ? Number(video.duration) : 0;

  if (!videoSrc) {
    return (
      <div className="p-6">
        <p className="text-[var(--muted-foreground)]">No playable file to trim yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit: {video.title}</h1>
      <TrimEditorWrapper
        videoId={id}
        videoSrc={videoSrc}
        durationSec={durationSec}
      />
    </div>
  );
}
