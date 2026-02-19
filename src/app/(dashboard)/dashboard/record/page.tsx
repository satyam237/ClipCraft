"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDisplayMedia, getUserMedia, stopStream } from "@/lib/recorder/media-capture";
import {
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  updatePauseState,
} from "@/lib/recorder/media-recorder";
import {
  openCameraPiPWindow,
  closeCameraPiPWindow,
} from "@/lib/recorder/picture-in-picture";
import { useRecorderStore } from "@/stores/recorder-store";
import { RecorderSetup } from "@/components/recorder/RecorderSetup";
import { RecorderOverlay } from "@/components/recorder/RecorderOverlay";
import { WebcamPreview } from "@/components/recorder/WebcamPreview";
import { CountdownOverlay } from "@/components/recorder/CountdownOverlay";

const DIMENSIONS = { "720p": { w: 1280, h: 720 }, "1080p": { w: 1920, h: 1080 } };

/** Notify ClipCraft extension (if installed) for overlay window. */
function notifyExtension(
  kind: "recording-started" | "recording-state" | "recording-stopped",
  payload?: {
    elapsedMs?: number;
    isPaused?: boolean;
    deviceId?: string | null;
    webcamEnabled?: boolean;
    webcamShape?: string;
  }
) {
  if (typeof window === "undefined") return;
  const DEBUG_EXTENSION_BRIDGE = false;
  if (DEBUG_EXTENSION_BRIDGE && kind === "recording-started") {
    console.debug("[ClipCraft] notifyExtension recording-started", payload);
  }
  window.postMessage(
    { type: "clipcraft-from-page", payload: { kind, ...payload } },
    "*"
  );
}

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
    startTime,
    pausedDurationMs,
    pauseStart,
  } =
    useRecorderStore();
  const [phase, setPhase] = useState<"setup" | "countdown" | "recording">("setup");
  const [isPaused, setIsPaused] = useState(false);
  const pauseStartRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const compositeStreamRef = useRef<MediaStream | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const [pipWindowActive, setPipWindowActive] = useState(false);
  const sessionIdRef = useRef<string>("");

  const recordingHandlersRef = useRef<{
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
    onRestart: () => void;
  } | null>(null);

  const handleStart = useCallback(async () => {
    setState("setting-up");
    setError(null);
    const { w, h } = DIMENSIONS[config.quality];
    try {
      // Set up all media streams first
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

          // Open Picture-in-Picture window if enabled and supported
          if (config.usePiPWindow) {
            const pipWindow = await openCameraPiPWindow(videoStream, {
              size: "medium",
              shape: config.webcamShape,
              onClose: () => {
                pipWindowRef.current = null;
                setPipWindowActive(false);
              },
              onPause: () => recordingHandlersRef.current?.onPause?.(),
              onResume: () => recordingHandlersRef.current?.onResume?.(),
              onStop: () => recordingHandlersRef.current?.onStop?.(),
              onRestart: () => recordingHandlersRef.current?.onRestart?.(),
            });
            if (pipWindow) {
              pipWindowRef.current = pipWindow;
              setPipWindowActive(true);
            }
          }
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

      // Store composite stream for use after countdown
      compositeStreamRef.current = compositeStream;

      // Show countdown before starting recording
      setPhase("countdown");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording");
      setState("idle");
      setPhase("setup");
      if (screenStreamRef.current) {
        stopStream(screenStreamRef.current);
        screenStreamRef.current = null;
      }
      if (webcamStream) {
        stopStream(webcamStream);
        setWebcamStream(null);
      }
      // Close PiP window if it was opened
      if (pipWindowRef.current) {
        closeCameraPiPWindow(pipWindowRef.current);
        pipWindowRef.current = null;
        setPipWindowActive(false);
      }
      compositeStreamRef.current = null;
    }
  }, [config, setState, setError]);

  const handleCountdownComplete = useCallback(async () => {
    if (!compositeStreamRef.current) return;

    try {
      const sessionId = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      sessionIdRef.current = sessionId;
      setSessionId(sessionId);
      setStartTime(Date.now());
      setPausedDurationMs(0);
      totalPausedMsRef.current = 0;

      const recorder = await startRecording(compositeStreamRef.current, sessionId);
      mediaRecorderRef.current = recorder;
      setState("recording");
      setPhase("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording");
      setState("idle");
      setPhase("setup");
      if (screenStreamRef.current) {
        stopStream(screenStreamRef.current);
        screenStreamRef.current = null;
      }
      if (webcamStream) {
        stopStream(webcamStream);
        setWebcamStream(null);
      }
      if (pipWindowRef.current) {
        closeCameraPiPWindow(pipWindowRef.current);
        pipWindowRef.current = null;
        setPipWindowActive(false);
      }
      compositeStreamRef.current = null;
    }
  }, [setState, setSessionId, setStartTime, setPausedDurationMs, setError, webcamStream]);

  const handleCountdownCancel = useCallback(() => {
    setPhase("setup");
    setState("idle");
    if (screenStreamRef.current) {
      stopStream(screenStreamRef.current);
      screenStreamRef.current = null;
    }
    if (webcamStream) {
      stopStream(webcamStream);
      setWebcamStream(null);
    }
    if (pipWindowRef.current) {
      closeCameraPiPWindow(pipWindowRef.current);
      pipWindowRef.current = null;
      setPipWindowActive(false);
    }
    compositeStreamRef.current = null;
  }, [setState, webcamStream]);

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
    // Close Picture-in-Picture window if open
    if (pipWindowRef.current) {
      closeCameraPiPWindow(pipWindowRef.current);
      pipWindowRef.current = null;
      setPipWindowActive(false);
    }
    setPhase("setup");
    setState("idle");
    setIsPaused(false);
    notifyExtension("recording-stopped");
    router.push(`/dashboard/preview?session=${sessionIdRef.current}`);
  }, [setState, router, webcamStream]);

  const handleRestart = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec) {
      stopRecording(rec);
      mediaRecorderRef.current = null;
    }
    setPauseStart(null);
    setPausedDurationMs(0);
    pauseStartRef.current = null;
    totalPausedMsRef.current = 0;
    setIsPaused(false);
    notifyExtension("recording-stopped");
    setPhase("countdown");
  }, [setPauseStart, setPausedDurationMs]);

  useEffect(() => {
    recordingHandlersRef.current = {
      onPause: handlePause,
      onResume: handleResume,
      onStop: handleStop,
      onRestart: handleRestart,
    };
  }, [handlePause, handleResume, handleStop, handleRestart]);

  // Notify extension when recording starts so it can show overlay on all tabs
  useEffect(() => {
    if (phase !== "recording") return;
    notifyExtension("recording-started", {
      elapsedMs: 0,
      isPaused: false,
      deviceId: config.videoDeviceId,
      webcamEnabled: config.webcamEnabled,
      webcamShape: config.webcamShape,
    });
  }, [phase, config.videoDeviceId, config.webcamEnabled, config.webcamShape]);

  // Push recording state to extension overlay window (timer and pause state)
  useEffect(() => {
    if (phase !== "recording" || !startTime) return;
    const interval = setInterval(() => {
      const base = Date.now();
      const effectiveNow = isPaused && pauseStart ? pauseStart : base;
      const elapsedMs = effectiveNow - startTime - pausedDurationMs;
      notifyExtension("recording-state", { elapsedMs, isPaused });
    }, 500);
    return () => clearInterval(interval);
  }, [phase, startTime, pausedDurationMs, pauseStart, isPaused]);


  // Handle pause/stop/restart from extension overlay window
  useEffect(() => {
    const onAction = (e: CustomEvent<{ action: string }>) => {
      const handler = recordingHandlersRef.current;
      if (!handler) return;
      switch (e.detail?.action) {
        case "pause":
          handler.onPause();
          break;
        case "resume":
          handler.onResume();
          break;
        case "stop":
          handler.onStop();
          break;
        case "restart":
          handler.onRestart();
          break;
      }
    };
    window.addEventListener("clipcraft-recorder-action", onAction as EventListener);
    return () => window.removeEventListener("clipcraft-recorder-action", onAction as EventListener);
  }, []);

  const handleCancel = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <>
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <RecorderSetup onStart={handleStart} onCancel={handleCancel} isSetupPhase={phase === "setup"} />
      </div>
      {phase === "countdown" && (
        <CountdownOverlay
          onComplete={handleCountdownComplete}
          onCancel={handleCountdownCancel}
        />
      )}
      {phase === "recording" && (
        <>
          <RecorderOverlay
            onStop={handleStop}
            onRestart={handleRestart}
            isPaused={isPaused}
            onPause={handlePause}
            onResume={handleResume}
          />
          {/* Only show WebcamPreview if PiP window is not active */}
          {!pipWindowActive && <WebcamPreview stream={webcamStream} />}
        </>
      )}
    </>
  );
}
