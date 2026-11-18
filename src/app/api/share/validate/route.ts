import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { token, videoId, passwordHash } = body as {
    token?: string;
    videoId?: string;
    passwordHash?: string;
  };

  if (!videoId) {
    return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: video } = await supabase
    .from("videos")
    .select("id, visibility, password_hash, allow_download")
    .eq("id", videoId)
    .single();

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (video.visibility === "public" || video.visibility === "unlisted") {
    return NextResponse.json({
      allowed: true,
      allowDownload: video.allow_download,
    });
  }

  if (video.visibility === "password") {
    if (!passwordHash || passwordHash !== video.password_hash) {
      return NextResponse.json({
        allowed: false,
        reason: "Password required",
        requirePassword: true,
      });
    }
    return NextResponse.json({
      allowed: true,
      allowDownload: video.allow_download,
    });
  }

  if (token) {
    const { data: result } = await supabase.rpc("validate_and_use_share_token", {
      token_text: token,
      video_uuid: videoId,
    });

    if (result && result.length > 0 && result[0].valid) {
      const tokenRow = await supabase
        .from("share_tokens")
        .select("require_password, allow_download")
        .eq("token", token)
        .single();

      if (tokenRow.data?.require_password) {
        if (!passwordHash || passwordHash !== video.password_hash) {
          return NextResponse.json({
            allowed: false,
            reason: "Password required",
            requirePassword: true,
          });
        }
      }

      return NextResponse.json({
        allowed: true,
        allowDownload: result[0].token_allow_download ?? tokenRow.data?.allow_download ?? true,
      });
    }

    const reason = result?.[0]?.reason ?? "Invalid or expired link";
    return NextResponse.json({ allowed: false, reason });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: canView } = await supabase.rpc("user_can_view_video", {
      video_uuid: videoId,
    });
    if (canView) {
      return NextResponse.json({
        allowed: true,
        allowDownload: video.allow_download,
      });
    }
  }

  return NextResponse.json({
    allowed: false,
    reason: "You don't have access to this video.",
  });
}
