import { saveChunk, createSession, updateSessionPause } from "./recording-db";

const CHUNK_MS = 2000;
// Aim for high-quality recording; browsers may cap this based on hardware.
const VIDEO_BITRATE = 8_000_000;
const AUDIO_BITRATE = 192_000;

export interface RecorderCallbacks {
  onChunk?: (index: number) => void;
  onError?: (err: Error) => void;
}

export async function startRecording(
  stream: MediaStream,
  sessionId: string,
  callbacks: RecorderCallbacks = {}
): Promise<MediaRecorder> {
  await createSession(sessionId);

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const options: MediaRecorderOptions = {
    mimeType,
    videoBitsPerSecond: VIDEO_BITRATE,
    audioBitsPerSecond: stream.getAudioTracks().length > 0 ? AUDIO_BITRATE : 0,
  };

  const recorder = new MediaRecorder(stream, options);
  let chunkIndex = 0;

  recorder.ondataavailable = async (e) => {
    if (e.data.size > 0) {
      await saveChunk(sessionId, chunkIndex, e.data);
      callbacks.onChunk?.(chunkIndex);
      chunkIndex += 1;
    }
  };

  recorder.onerror = () => {
    callbacks.onError?.(new Error("MediaRecorder error"));
  };

  recorder.start(CHUNK_MS);
  return recorder;
}

export function pauseRecording(recorder: MediaRecorder): void {
  if (recorder.state === "recording") {
    recorder.pause();
  }
}

export function resumeRecording(recorder: MediaRecorder): void {
  if (recorder.state === "paused") {
    recorder.resume();
  }
}

export function stopRecording(recorder: MediaRecorder): void {
  if (recorder.state === "recording" || recorder.state === "paused") {
    recorder.stop();
  }
}

export async function updatePauseState(
  sessionId: string,
  pausedAt: number | null,
  totalPausedMs: number
): Promise<void> {
  await updateSessionPause(sessionId, pausedAt, totalPausedMs);
}
