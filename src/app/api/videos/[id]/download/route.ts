import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: video } = await supabase
    .from("videos")
    .select("id, visibility, allow_download")
    .eq("id", id)
    .single();
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (video.allow_download === false) {
    return NextResponse.json({ error: "Download not allowed for this video" }, { status: 403 });
  }

  const { data: assets } = await supabase
    .from("video_assets")
    .select("asset_type, storage_path")
    .eq("video_id", id);
  const mp4 = assets?.find((a) => a.asset_type === "mp4");
  const raw = assets?.find((a) => a.asset_type === "raw_webm");
  const path = mp4?.storage_path ?? raw?.storage_path;
  if (!path) return NextResponse.json({ error: "No file" }, { status: 404 });

  const { data } = await supabase.storage
    .from("recordings")
    .createSignedUrl(path, 60);
  if (!data?.signedUrl) return NextResponse.json({ error: "Failed to sign" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
