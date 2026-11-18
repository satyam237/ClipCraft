import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { WatchPageClient } from "@/components/player/WatchPageClient";
import { PasswordGate } from "@/components/player/PasswordGate";
import { getSignedUrl } from "@/lib/supabase/storage";

async function getVideoAssets(supabase: Awaited<ReturnType<typeof createClient>>, videoId: string) {
  const { data: assets } = await supabase
    .from("video_assets")
    .select("asset_type, storage_path, metadata")
    .eq("video_id", videoId);

  const rawAsset = assets?.find((a) => a.asset_type === "raw_webm");
  const mp4Asset = assets?.find((a) => a.asset_type === "mp4");
  const vttAsset = assets?.find((a) => a.asset_type === "vtt");
  const transcriptAsset = assets?.find((a) => a.asset_type === "transcript_json");

  const [videoUrl, vttUrl] = await Promise.all([
    mp4Asset
      ? getSignedUrl(mp4Asset.storage_path)
      : rawAsset
        ? getSignedUrl(rawAsset.storage_path)
        : null,
    vttAsset ? getSignedUrl(vttAsset.storage_path) : null,
  ]);

  const transcriptText =
    transcriptAsset?.metadata && typeof transcriptAsset.metadata === "object" && "text" in transcriptAsset.metadata
      ? String((transcriptAsset.metadata as { text?: string }).text ?? "")
      : null;

  return { videoUrl, vttUrl, transcriptText };
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: video, error } = await supabase
    .from("videos")
    .select("id, title, description, status, duration, visibility, allow_download, password_hash, owner_id")
    .eq("id", id)
    .single();

  if (error || !video) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (video.visibility === "restricted") {
    const isOwner = user?.id === video.owner_id;
    if (!isOwner) {
      if (!user) notFound();
      const { data: invitee } = await supabase
        .from("video_invitees")
        .select("id")
        .eq("video_id", id)
        .eq("email", user.email ?? "")
        .maybeSingle();
      if (!invitee) notFound();
    }
  }

  const { videoUrl, vttUrl, transcriptText } = await getVideoAssets(supabase, id);

  if (video.visibility === "password" && video.password_hash) {
    return (
      <PasswordGate
        videoId={id}
        title={video.title}
        passwordHash={video.password_hash}
        videoUrl={videoUrl}
        duration={video.duration}
        captionUrl={vttUrl}
        transcriptText={transcriptText}
        allowDownload={video.allow_download !== false}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, var(--gradient-from) 0%, var(--gradient-via) 50%, var(--gradient-to) 100%)" }}>
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
          <div className="aspect-video flex flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--muted)] px-4 text-center text-[var(--muted-foreground)]">
            {video.status === "uploading" ? (
              <>
                <p className="font-medium">This video is still uploading.</p>
                <p className="text-sm">Please check back in a moment. The link will work once the upload finishes.</p>
              </>
            ) : video.status === "processing" ? (
              "Processing..."
            ) : (
              "No playable file yet."
            )}
          </div>
        )}
      </div>
    </div>
  );
}
