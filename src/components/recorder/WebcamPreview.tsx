"use client";

import { useEffect, useRef, useState } from "react";
import { useRecorderStore } from "@/stores/recorder-store";
import { cn } from "@/lib/utils";

const PREVIEW_MARGIN = 16;
const PREVIEW_SIZE = 240;

function getDefaultPosition() {
  if (typeof window === "undefined") return { top: 0, left: PREVIEW_MARGIN };
  return {
    top: window.innerHeight - PREVIEW_SIZE - PREVIEW_MARGIN,
    left: PREVIEW_MARGIN,
  };
}

export function WebcamPreview({ stream }: { stream: MediaStream | null }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { config } = useRecorderStore();
  const [position, setPosition] = useState<{ top: number; left: number }>(
    getDefaultPosition
  );
  const dragState = useRef<{
    startX: number;
    startY: number;
    startTop: number;
    startLeft: number;
    dragging: boolean;
  } | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    return () => {
      if (el.srcObject === stream) {
        el.srcObject = null;
      }
    };
  }, [stream]);

  if (!config.webcamEnabled || !stream) return null;

  const handlePointerDown = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    const point =
      "touches" in e ? e.touches[0] : (e as React.MouseEvent<HTMLDivElement>);
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    dragState.current = {
      startX: point.clientX,
      startY: point.clientY,
      startTop: rect.top,
      startLeft: rect.left,
      dragging: true,
    };
  };

  const handlePointerMove = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    if (!dragState.current || !dragState.current.dragging) return;
    const point =
      "touches" in e ? e.touches[0] : (e as React.MouseEvent<HTMLDivElement>);
    const dx = point.clientX - dragState.current.startX;
    const dy = point.clientY - dragState.current.startY;
    const size = PREVIEW_SIZE;
    const margin = 8;
    const maxTop = window.innerHeight - size - margin;
    const maxLeft = window.innerWidth - size - margin;
    const rawTop = dragState.current.startTop + dy;
    const rawLeft = dragState.current.startLeft + dx;
    const top = Math.min(Math.max(margin, rawTop), maxTop);
    const left = Math.min(Math.max(margin, rawLeft), maxLeft);
    setPosition({ top, left });
  };

  const handlePointerUp = () => {
    if (dragState.current) {
      dragState.current.dragging = false;
    }
  };

  const shapeClass =
    config.webcamShape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div
      className={cn(
        "fixed z-9999 h-60 w-60 overflow-hidden border border-white/40 bg-black/60 shadow-xl cursor-move",
        shapeClass,
      )}
      style={{ top: position.top, left: position.left }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
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

