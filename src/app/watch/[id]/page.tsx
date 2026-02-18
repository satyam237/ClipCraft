import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { WatchPageClient } from "@/components/player/WatchPageClient";
import { getSignedUrl } from "@/lib/supabase/storage";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: video, error } = await supabase
    .from("videos")
    .select("id, title, description, status, duration, visibility, allow_download")
    .eq("id", id)
    .single();

  if (error || !video) notFound();
  if (video.status !== "ready" && video.status !== "processing") {
    // Allow viewing while processing (raw or placeholder)
  }

  const { data: assets } = await supabase
    .from("video_assets")
    .select("asset_type, storage_path, metadata")
    .eq("video_id", id);

  const rawAsset = assets?.find((a) => a.asset_type === "raw_webm");
  const mp4Asset = assets?.find((a) => a.asset_type === "mp4");
  const vttAsset = assets?.find((a) => a.asset_type === "vtt");
  const vttUrl = vttAsset ? await getSignedUrl(vttAsset.storage_path) : null;
  const transcriptAsset = assets?.find((a) => a.asset_type === "transcript_json");
  const transcriptText =
    transcriptAsset?.metadata && typeof transcriptAsset.metadata === "object" && "text" in transcriptAsset.metadata
      ? String((transcriptAsset.metadata as { text?: string }).text ?? "")
      : null;

  const videoUrl = mp4Asset
    ? await getSignedUrl(mp4Asset.storage_path)
    : rawAsset
      ? await getSignedUrl(rawAsset.storage_path)
      : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-semibold">{video.title}</h1>
        {videoUrl ? (
          <WatchPageClient
            videoUrl={videoUrl}
            videoId={id}
            title={video.title}
            duration={video.duration}
            captionUrl={vttUrl}
            transcriptText={transcriptText}
            isProcessing={video.status === "processing"}
            allowDownload={video.allow_download !== false}
          />
        ) : (
          <div className="aspect-video flex flex-col items-center justify-center gap-2 rounded-lg bg-(--muted) px-4 text-center text-(--muted-foreground)">
            {video.status === "uploading" ? (
              <>
                <p className="font-medium">This video is still uploading.</p>
                <p className="text-sm">Please check back in a moment. The link will work once the upload finishes.</p>
              </>
            ) : video.status === "processing" ? (
              "Processing…"
            ) : (
              "No playable file yet."
            )}
          </div>
        )}
      </div>
    </div>
  );
}
