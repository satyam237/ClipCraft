"use client";

import { useEffect, useRef, useState } from "react";
import { getUserMedia, stopStream } from "@/lib/recorder/media-capture";
import type { RecorderConfig, DeviceInfo, WebcamShape } from "@/types/recorder";
import { cn } from "@/lib/utils";

const ASPECT_RATIOS: Record<WebcamShape, { width: number; height: number }> = {
  circle: { width: 1, height: 1 },
  square: { width: 1, height: 1 },
  mobile: { width: 9, height: 16 },
  laptop: { width: 16, height: 9 },
  classic: { width: 3, height: 4 },
};

const PREVIEW_SIZE = 240;

interface CameraPreviewProps {
  config: RecorderConfig;
  devices: { video: DeviceInfo[]; audio: DeviceInfo[] };
  /** When true, render inside the layout (e.g. in setup card). When false, render as floating overlay. */
  inline?: boolean;
}

export function CameraPreview({ config, devices, inline = false }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  // Request camera stream when webcam is enabled (show preview on setup page regardless of PiP)
  useEffect(() => {
    if (!config.webcamEnabled) {
      if (streamRef.current) {
        stopStream(streamRef.current);
        streamRef.current = null;
        setPreviewStream(null);
      }
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setError(null);
        const { videoStream } = await getUserMedia(
          config.videoDeviceId,
          null,
          true,
          false
        );

        if (cancelled) {
          if (videoStream) stopStream(videoStream);
          return;
        }

        if (videoStream) {
          streamRef.current = videoStream;
          setPreviewStream(videoStream);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to access camera");
        console.error("Failed to get camera preview:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        stopStream(streamRef.current);
        streamRef.current = null;
        setPreviewStream(null);
      }
    };
  }, [config.webcamEnabled, config.videoDeviceId]);

  // Set video source
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !previewStream) return;
    el.srcObject = previewStream;
    return () => {
      if (el.srcObject === previewStream) {
        el.srcObject = null;
      }
    };
  }, [previewStream]);

  // Position preview where it will appear during recording: PiP = bottom-left, in-window = webcamPosition
  useEffect(() => {
    const margin = 16;
    const aspectRatio = ASPECT_RATIOS[config.webcamShape];
    const aspectValue = aspectRatio.width / aspectRatio.height;

    let width = PREVIEW_SIZE;
    let height = PREVIEW_SIZE;

    if (config.webcamShape === "mobile") {
      height = PREVIEW_SIZE * 1.5;
      width = height * aspectValue;
    } else if (config.webcamShape === "laptop") {
      width = PREVIEW_SIZE * 1.5;
      height = width / aspectValue;
    } else if (config.webcamShape === "classic") {
      height = PREVIEW_SIZE * 1.2;
      width = height * aspectValue;
    }

    const viewportHeight = window.innerHeight;

    // Default position: bottom-left for all shapes and views (matches recording overlay)
    const left = margin;
    const top = viewportHeight - height - margin;

    setPosition({ top, left });
  }, [config.webcamShape]);

  if (!config.webcamEnabled) {
    return null;
  }

  if (error) {
    return (
      <div className={inline ? "rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-600 dark:text-red-400 text-center" : "fixed bottom-4 right-4 z-50 rounded-lg bg-red-500/90 px-4 py-2 text-sm text-white"}>
        Camera unavailable: {error}
      </div>
    );
  }

  if (!previewStream) {
    if (inline) {
      return (
        <div className="flex items-center justify-center w-full py-12 text-sm text-muted-foreground">
          Starting camera…
        </div>
      );
    }
    return null;
  }

  const aspectRatio = ASPECT_RATIOS[config.webcamShape];
  const aspectValue = aspectRatio.width / aspectRatio.height;

  // Calculate dimensions based on shape
  let width = PREVIEW_SIZE;
  let height = PREVIEW_SIZE;

  if (config.webcamShape === "mobile") {
    height = PREVIEW_SIZE * 1.5;
    width = height * aspectValue;
  } else if (config.webcamShape === "laptop") {
    width = PREVIEW_SIZE * 1.5;
    height = width / aspectValue;
  } else if (config.webcamShape === "classic") {
    height = PREVIEW_SIZE * 1.2;
    width = height * aspectValue;
  }

  const shapeClass =
    config.webcamShape === "circle" ? "rounded-full" : "rounded-xl";

  const margin = 16;
  const positionStyle = inline
    ? {}
    : (position
      ? { top: `${position.top}px`, left: `${position.left}px` }
      : { top: `calc(100vh - ${height}px - ${margin}px)`, left: `${margin}px` } as React.CSSProperties);

  return (
    <div
      className={cn(
        "overflow-hidden border border-white/40 bg-black/60 shadow-xl",
        shapeClass,
        inline ? "w-full max-w-sm mx-auto min-h-[180px]" : "fixed z-50",
      )}
      style={{
        aspectRatio: `${aspectRatio.width} / ${aspectRatio.height}`,
        ...(inline ? {} : { width: `${width}px`, height: `${height}px` }),
        ...positionStyle,
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-cover"
      />
    </div>
  );
}
