import { createClient } from "@/lib/supabase/client";
import { getChunksForSession } from "@/lib/recorder/recording-db";

const BUCKET = "recordings";
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;

export interface UploadProgress {
  phase: "combining" | "uploading" | "verifying" | "done";
  loaded: number;
  total: number;
  percent: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Uploads the recording as a single combined blob. Combines chunks in memory,
 * then uploads with retries. No per-chunk upload — simpler and more reliable.
 */
export async function uploadRecording(
  sessionId: string,
  videoId: string,
  workspaceId: string,
  onProgress?: (p: UploadProgress) => void
): Promise<{ path: string }> {
  const chunks = await getChunksForSession(sessionId);
  if (chunks.length === 0) {
    throw new Error("No recording chunks found for this session. Try recording again.");
  }

  onProgress?.({
    phase: "combining",
    loaded: 0,
    total: 1,
    percent: 0,
  });

  const combinedBlob = new Blob(chunks.map((c) => c.blob), { type: "video/webm" });
  const total = combinedBlob.size;
  const path = `${workspaceId}/${videoId}/raw.webm`;
  const supabase = createClient();

  onProgress?.({
    phase: "uploading",
    loaded: 0,
    total,
    percent: 0,
  });

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const uploadPromise = supabase.storage
        .from(BUCKET)
        .upload(path, combinedBlob, {
          contentType: "video/webm",
          upsert: true,
          cacheControl: "3600",
        });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Upload timeout")), UPLOAD_TIMEOUT_MS)
      );

      const { error } = await Promise.race([uploadPromise, timeoutPromise]);

      if (error) {
        throw new Error(`Storage upload: ${error.message}`);
      }

      onProgress?.({
        phase: "verifying",
        loaded: total,
        total,
        percent: 100,
      });

      const { data: fileInfo, error: listError } = await supabase.storage
        .from(BUCKET)
        .list(`${workspaceId}/${videoId}`, { limit: 10 });

      if (listError) {
        throw new Error(`Upload verification: ${listError.message}`);
      }
      if (!fileInfo?.some((f) => f.name === "raw.webm")) {
        throw new Error("Upload verification failed: file not found in bucket. Ensure Supabase migrations are applied and the recordings bucket exists.");
      }

      onProgress?.({
        phase: "done",
        loaded: total,
        total,
        percent: 100,
      });

      return { path };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        await sleep(1000 * attempt);
      }
    }
  }

  throw lastError ?? new Error("Upload failed after retries");
}
