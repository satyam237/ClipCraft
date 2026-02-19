/**
 * ClipCraft offscreen document: independently captures webcam frames
 * and streams them to the service worker for distribution to all tabs.
 * This avoids background tab throttling issues.
 */

const TARGET_FPS = 20;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
const TARGET_RESOLUTION = 480; // 480x480 for high quality

let video = null;
let stream = null;
let canvas = null;
let ctx = null;
let frameCallbackId = null;
let port = null;
let isCapturing = false;
let captureIntervalId = null;
let encodeInFlight = false;

// Connect to service worker
port = chrome.runtime.connect({ name: "offscreen-to-background" });

port.onMessage.addListener((message) => {
  console.log("[ClipCraft Offscreen] Received message:", message.type);
  if (message.type === "start-capture") {
    console.log("[ClipCraft Offscreen] Starting capture with deviceId:", message.deviceId);
    startCapture(message.deviceId);
  } else if (message.type === "stop-capture") {
    console.log("[ClipCraft Offscreen] Stopping capture");
    stopCapture();
  }
});

port.onDisconnect.addListener(() => {
  stopCapture();
});

async function startCapture(deviceId) {
  if (isCapturing) {
    console.log("[ClipCraft Offscreen] Already capturing, ignoring start-capture");
    return;
  }
  isCapturing = true;
  encodeInFlight = false;

  try {
    // Get user media with specified device
    const constraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: TARGET_RESOLUTION }, height: { ideal: TARGET_RESOLUTION } }
        : { width: { ideal: TARGET_RESOLUTION }, height: { ideal: TARGET_RESOLUTION } },
    };

    console.log("[ClipCraft Offscreen] Requesting getUserMedia with constraints:", JSON.stringify(constraints));
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log("[ClipCraft Offscreen] Got media stream:", stream.id, "tracks:", stream.getVideoTracks().length);
    
    // Create video element to play the stream
    video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    
    await video.play();
    console.log("[ClipCraft Offscreen] Video playing, starting frame capture");

    // Create offscreen canvas for frame capture
    canvas = new OffscreenCanvas(TARGET_RESOLUTION, TARGET_RESOLUTION);
    ctx = canvas.getContext("2d", { willReadFrequently: false });

    // Start capturing frames.
    // Note: requestVideoFrameCallback is unreliable in offscreen documents in some Chrome builds.
    // Use a fixed interval loop instead so frames keep flowing.
    startIntervalCapture();
  } catch (error) {
    console.error("[ClipCraft Offscreen] Failed to start webcam capture:", error);
    console.error("[ClipCraft Offscreen] Error details:", {
      name: error.name,
      message: error.message,
      constraint: error.constraint,
    });
    port.postMessage({ type: "capture-error", error: error.message || String(error) });
    isCapturing = false;
  }
}

function startIntervalCapture() {
  if (captureIntervalId) {
    clearInterval(captureIntervalId);
    captureIntervalId = null;
  }

  captureIntervalId = setInterval(() => {
    if (!isCapturing || !video || !canvas || !ctx || !port) return;
    if (encodeInFlight) return;
    if (video.readyState < 2) return;
    if (!video.videoWidth || !video.videoHeight) return;

    try {
      // Draw video frame to canvas (cover square)
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const side = Math.min(vw, vh);
      const sx = Math.floor((vw - side) / 2);
      const sy = Math.floor((vh - side) / 2);
      ctx.drawImage(video, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.error("[ClipCraft Offscreen] drawImage failed:", e);
      return;
    }

    encodeInFlight = true;

    const toDataUrl = async (blob) => {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    };

    const encodeAndSend = async () => {
      try {
        if (!canvas.convertToBlob) {
          throw new Error("OffscreenCanvas.convertToBlob not available");
        }
        let blob;
        try {
          blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.9 });
        } catch {
          blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
        }

        const dataUrl = await toDataUrl(blob);
        port.postMessage({ type: "frame", dataUrl });

        if (!window._frameCount) window._frameCount = 0;
        window._frameCount++;
        if (window._frameCount <= 3) {
          console.log("[ClipCraft Offscreen] Sent frame", window._frameCount, "size:", dataUrl.length);
        }
      } catch (e) {
        console.error("[ClipCraft Offscreen] encode/send failed:", e);
      } finally {
        encodeInFlight = false;
      }
    };

    encodeAndSend();
  }, FRAME_INTERVAL_MS);
}

function stopCapture() {
  isCapturing = false;
  encodeInFlight = false;

  if (frameCallbackId) {
    clearTimeout(frameCallbackId);
    frameCallbackId = null;
  }

  if (captureIntervalId) {
    clearInterval(captureIntervalId);
    captureIntervalId = null;
  }

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  if (video) {
    video.srcObject = null;
    video = null;
  }

  canvas = null;
  ctx = null;
}
