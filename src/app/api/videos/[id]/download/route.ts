import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  const supabase = await createClient();
  const { data: video } = await supabase
    .from("videos")
    .select("id, visibility, allow_download, password_hash")
    .eq("id", id)
    .single();

  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let downloadAllowed = video.allow_download !== false;

  if (token) {
    const { data: tokenRow } = await supabase
      .from("share_tokens")
      .select("allow_download, expires_at, max_views, current_views")
      .eq("token", token)
      .eq("video_id", id)
      .single();

    if (!tokenRow) {
      return NextResponse.json({ error: "Invalid share token" }, { status: 403 });
    }

    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: "This link has expired" }, { status: 403 });
    }

    if (
      tokenRow.max_views != null &&
      tokenRow.current_views >= tokenRow.max_views
    ) {
      return NextResponse.json(
        { error: "This link has reached its maximum number of views" },
        { status: 403 }
      );
    }

    downloadAllowed = tokenRow.allow_download;
  } else if (video.visibility === "password" || video.visibility === "restricted") {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: canView } = await supabase.rpc("user_can_view_video", {
      video_uuid: id,
    });

    if (!canView) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  if (!downloadAllowed) {
    return NextResponse.json(
      { error: "Download not allowed for this video" },
      { status: 403 }
    );
  }

  const { data: assets } = await supabase
    .from("video_assets")
    .select("asset_type, storage_path")
    .eq("video_id", id);

  const mp4 = assets?.find((a) => a.asset_type === "mp4");
  const raw = assets?.find((a) => a.asset_type === "raw_webm");
  const path = mp4?.storage_path ?? raw?.storage_path;

  if (!path) {
    return NextResponse.json({ error: "No file" }, { status: 404 });
  }

  const { data } = await supabase.storage
    .from("recordings")
    .createSignedUrl(path, 60);

  if (!data?.signedUrl) {
    return NextResponse.json({ error: "Failed to sign" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
