"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getDisplayMedia, getUserMedia, stopStream } from "@/lib/recorder/media-capture";
import {
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  updatePauseState,
} from "@/lib/recorder/media-recorder";
import { useRecorderStore } from "@/stores/recorder-store";
import { RecorderSetup } from "@/components/recorder/RecorderSetup";
import { RecorderOverlay } from "@/components/recorder/RecorderOverlay";
import { WebcamPreview } from "@/components/recorder/WebcamPreview";

const DIMENSIONS = { "720p": { w: 1280, h: 720 }, "1080p": { w: 1920, h: 1080 } };

export default function RecordPage() {
  const router = useRouter();
  const {
    config,
    setState,
    setSessionId,
    setStartTime,
    setPausedDurationMs,
    setPauseStart,
    setError,
  } =
    useRecorderStore();
  const [phase, setPhase] = useState<"setup" | "recording">("setup");
  const [isPaused, setIsPaused] = useState(false);
  const pauseStartRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const sessionIdRef = useRef<string>("");

  const handleStart = useCallback(async () => {
    setState("setting-up");
    setError(null);
    const { w, h } = DIMENSIONS[config.quality];
    try {
      const screenStream = await getDisplayMedia(config.captureSource, w, h);
      screenStreamRef.current = screenStream;

      // Match canvas size to actual captured resolution where possible to reduce stretching.
      const track = screenStream.getVideoTracks()[0];
      const settings = track?.getSettings?.() ?? {};
      const width = typeof settings.width === "number" ? settings.width : w;
      const height = typeof settings.height === "number" ? settings.height : h;

      let compositeStream: MediaStream = screenStream;

      if (config.webcamEnabled) {
        const { videoStream } = await getUserMedia(
          config.videoDeviceId,
          null,
          true,
          false
        );
        if (videoStream) {
          setWebcamStream(videoStream);
        }
      }

      if (config.micEnabled) {
        const { audioStream } = await getUserMedia(
          null,
          config.audioDeviceId,
          false,
          true
        );
        if (audioStream) {
          const audioTrack = audioStream.getAudioTracks()[0];
          if (audioTrack) compositeStream.addTrack(audioTrack);
        }
      }

      const sessionId = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      sessionIdRef.current = sessionId;
      setSessionId(sessionId);
      setStartTime(Date.now());
      setPausedDurationMs(0);
      totalPausedMsRef.current = 0;

      const recorder = await startRecording(compositeStream, sessionId);
      mediaRecorderRef.current = recorder;
      setState("recording");
      setPhase("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording");
      setState("idle");
      if (screenStreamRef.current) {
        stopStream(screenStreamRef.current);
        screenStreamRef.current = null;
      }
    }
  }, [config, setState, setSessionId, setStartTime, setPausedDurationMs, setError]);

  const handlePause = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== "recording") return;
    pauseRecording(rec);
    setIsPaused(true);
    const now = Date.now();
    pauseStartRef.current = now;
    setPauseStart(now);
  }, [setPauseStart]);

  const handleResume = useCallback(async () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== "paused") return;
    if (pauseStartRef.current) {
      totalPausedMsRef.current += Date.now() - pauseStartRef.current;
      setPausedDurationMs(totalPausedMsRef.current);
      await updatePauseState(
        sessionIdRef.current,
        null,
        totalPausedMsRef.current
      );
    }
    pauseStartRef.current = null;
    setPauseStart(null);
    resumeRecording(rec);
    setIsPaused(false);
  }, [setPausedDurationMs]);

  const handleStop = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec) {
      stopRecording(rec);
      mediaRecorderRef.current = null;
    }
    if (screenStreamRef.current) {
      stopStream(screenStreamRef.current);
      screenStreamRef.current = null;
    }
    if (webcamStream) {
      stopStream(webcamStream);
      setWebcamStream(null);
    }
    setPhase("setup");
    setState("idle");
    setIsPaused(false);
    router.push(`/dashboard/preview?session=${sessionIdRef.current}`);
  }, [setState, router]);

  const handleCancel = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <>
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <RecorderSetup onStart={handleStart} onCancel={handleCancel} />
      </div>
      {phase === "recording" && (
        <>
          <RecorderOverlay
            onStop={handleStop}
            isPaused={isPaused}
            onPause={handlePause}
            onResume={handleResume}
          />
          <WebcamPreview stream={webcamStream} />
        </>
      )}
    </>
  );
}
