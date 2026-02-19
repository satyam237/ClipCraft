import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

interface TranscribePayload {
  video_id: string;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing env: OPENAI_API_KEY or Supabase keys" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: TranscribePayload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { video_id } = body;
  if (!video_id) {
    return new Response(JSON.stringify({ error: "video_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const { data: assets } = await supabase
    .from("video_assets")
    .select("storage_path")
    .eq("video_id", video_id)
    .in("asset_type", ["raw_webm", "mp4"])
    .limit(1);

  const path = assets?.[0]?.storage_path;
  if (!path) {
    return new Response(JSON.stringify({ error: "No video asset" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: fileData } = await supabase.storage.from("recordings").download(path);
  if (!fileData) {
    return new Response(JSON.stringify({ error: "Could not download file" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const formData = new FormData();
  formData.append("file", fileData, "video.webm");
  formData.append("model", "whisper-1");

  const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    return new Response(
      JSON.stringify({ error: "Whisper failed", detail: errText }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const transcript = await openaiRes.json();
  const text =
    typeof transcript === "object" && transcript.text != null
      ? transcript.text
      : String(transcript);

  const vtt = toVTT(text);
  const srt = toSRT(text);

  await supabase.storage
    .from("recordings")
    .upload(`transcripts/${video_id}/captions.vtt`, new Blob([vtt]), {
      upsert: true,
    });
  await supabase.storage
    .from("recordings")
    .upload(`transcripts/${video_id}/captions.srt`, new Blob([srt]), {
      upsert: true,
    });

  await supabase.from("video_assets").insert([
    {
      video_id,
      asset_type: "transcript_json",
      storage_path: `transcripts/${video_id}/transcript.json`,
      metadata: { text },
    },
    {
      video_id,
      asset_type: "vtt",
      storage_path: `transcripts/${video_id}/captions.vtt`,
      metadata: {},
    },
    {
      video_id,
      asset_type: "srt",
      storage_path: `transcripts/${video_id}/captions.srt`,
      metadata: {},
    },
  ]);

  const { data: jobs } = await supabase
    .from("processing_jobs")
    .select("id")
    .eq("video_id", video_id)
    .eq("job_type", "transcribe")
    .limit(1);
  if (jobs?.[0]) {
    await supabase
      .from("processing_jobs")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", jobs[0].id);
  }

  return new Response(
    JSON.stringify({ ok: true, text: text.slice(0, 200) }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

function toVTT(text: string): string {
  return `WEBVTT\n\n00:00:00.000 --> 00:00:00.000\n${text}\n`;
}

function toSRT(text: string): string {
  return `1\n00:00:00,000 --> 00:00:00,000\n${text}\n`;
}
