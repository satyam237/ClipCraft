import type { WebcamPosition, WebcamShape } from "@/types/recorder";

const CAM_SIZE = 240;
const PADDING = 16;

export function drawWebcamOverlay(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  position: WebcamPosition,
  shape: WebcamShape
): void {
  if (video.readyState < 2) return;

  const x =
    position.includes("right")
      ? width - CAM_SIZE - PADDING
      : PADDING;
  const y =
    position.includes("bottom")
      ? height - CAM_SIZE - PADDING
      : PADDING;

  ctx.save();

  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(x + CAM_SIZE / 2, y + CAM_SIZE / 2, CAM_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  ctx.drawImage(video, x, y, CAM_SIZE, CAM_SIZE);

  if (shape === "circle") {
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + CAM_SIZE / 2, y + CAM_SIZE / 2, CAM_SIZE / 2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.restore();
  }
}

const TARGET_FPS = 30;

export function createCompositeStream(
  screenStream: MediaStream,
  webcamVideo: HTMLVideoElement | null,
  width: number,
  height: number,
  position: WebcamPosition,
  shape: WebcamShape
): { stream: MediaStream; stop: () => void } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d not available");

  const screenVideo = document.createElement("video");
  screenVideo.srcObject = screenStream;
  screenVideo.muted = true;
  screenVideo.playsInline = true;
  screenVideo.play().catch(() => {});

  const stream = canvas.captureStream(TARGET_FPS);
  let rafId: number;

  const draw = () => {
    if (screenVideo.readyState >= 2) {
      ctx.drawImage(screenVideo, 0, 0, width, height);
      if (webcamVideo) {
        drawWebcamOverlay(ctx, webcamVideo, width, height, position, shape);
      }
    }
    rafId = requestAnimationFrame(draw);
  };
  draw();

  return {
    stream,
    stop: () => cancelAnimationFrame(rafId),
  };
}
