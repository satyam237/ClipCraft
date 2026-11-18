import { createClient } from "@/lib/supabase/client";
import { getChunksForSession } from "@/lib/recorder/recording-db";

const BUCKET = "recordings";
const UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_RETRIES = 5;
const MAX_BLOB_SIZE = 500 * 1024 * 1024; // 500 MB safety limit

export interface UploadProgress {
  phase: "combining" | "uploading" | "verifying" | "done";
  loaded: number;
  total: number;
  percent: number;
  attempt?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt - 1), 30_000) + Math.random() * 500;
}

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

  onProgress?.({ phase: "combining", loaded: 0, total: 1, percent: 0 });

  const combinedBlob = new Blob(chunks.map((c) => c.blob), { type: "video/webm" });
  const total = combinedBlob.size;

  if (total === 0) {
    throw new Error("Recording is empty (0 bytes). Please try recording again.");
  }
  if (total > MAX_BLOB_SIZE) {
    throw new Error(
      `Recording is too large (${(total / 1024 / 1024).toFixed(0)} MB). Maximum is ${MAX_BLOB_SIZE / 1024 / 1024} MB.`
    );
  }

  const path = `${workspaceId}/${videoId}/raw.webm`;
  const supabase = createClient();

  onProgress?.({ phase: "uploading", loaded: 0, total, percent: 0 });

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      onProgress?.({ phase: "uploading", loaded: 0, total, percent: 0, attempt });

      const uploadPromise = supabase.storage
        .from(BUCKET)
        .upload(path, combinedBlob, {
          contentType: "video/webm",
          upsert: true,
          cacheControl: "3600",
        });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Upload timed out after ${UPLOAD_TIMEOUT_MS / 60000} minutes`)),
          UPLOAD_TIMEOUT_MS
        )
      );

      const { error } = await Promise.race([uploadPromise, timeoutPromise]);

      if (error) {
        const msg = error.message ?? String(error);
        if (msg.includes("Bucket not found") || msg.includes("bucket")) {
          throw new Error(
            "Storage bucket 'recordings' not found. Please ensure Supabase migrations are applied."
          );
        }
        throw new Error(`Storage upload: ${msg}`);
      }

      onProgress?.({ phase: "verifying", loaded: total, total, percent: 100 });

      let verified = false;
      for (let vAttempt = 0; vAttempt < 3; vAttempt++) {
        const { data: fileInfo, error: listError } = await supabase.storage
          .from(BUCKET)
          .list(`${workspaceId}/${videoId}`, { limit: 10 });

        if (listError) {
          if (vAttempt < 2) {
            await sleep(1000);
            continue;
          }
          throw new Error(`Upload verification: ${listError.message}`);
        }
        if (fileInfo?.some((f) => f.name === "raw.webm")) {
          verified = true;
          break;
        }
        if (vAttempt < 2) await sleep(1000);
      }

      if (!verified) {
        throw new Error(
          "Upload verification failed: file not found in bucket after upload. " +
          "This may be a temporary issue — please retry."
        );
      }

      onProgress?.({ phase: "done", loaded: total, total, percent: 100 });
      return { path };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isFatal =
        lastError.message.includes("Bucket not found") ||
        lastError.message.includes("too large");
      if (isFatal || attempt >= MAX_RETRIES) break;
      await sleep(backoffMs(attempt));
    }
  }

  const finalMsg = lastError?.message ?? "Upload failed after retries";
  throw new Error(
    `${finalMsg} (tried ${MAX_RETRIES} times). Check your connection and try again.`
  );
}
