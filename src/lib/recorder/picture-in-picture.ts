/**
 * Document Picture-in-Picture API utilities for camera preview
 * Creates a floating window that persists across browser tabs
 */

import type { WebcamShape } from "@/types/recorder";

export function isPictureInPictureSupported(): boolean {
  const hasWindow = typeof window !== "undefined";
  const hasPiP = hasWindow && "documentPictureInPicture" in window;
  return hasPiP;
}

export interface CameraPiPWindowOptions {
  width?: number;
  height?: number;
  size?: "small" | "medium" | "large";
  shape?: WebcamShape;
  onClose?: () => void;
  onResize?: (size: "small" | "medium" | "large") => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onRestart?: () => void;
}

const SIZE_PRESETS = {
  small: { width: 200, height: 200 },
  medium: { width: 300, height: 300 },
  large: { width: 400, height: 400 },
} as const;

const ASPECT_RATIOS: Record<WebcamShape, { width: number; height: number }> = {
  circle: { width: 1, height: 1 },
  square: { width: 1, height: 1 },
  mobile: { width: 9, height: 16 },
  laptop: { width: 16, height: 9 },
  classic: { width: 3, height: 4 },
};

const CONTROLS_HEIGHT = 40;
const MIN_CONTENT_SIZE = 120;
const CIRCLE_PADDING = 24;

/**
 * Calculate minimum window size for a given shape
 */
function getMinimumSize(shape: WebcamShape): { width: number; height: number } {
  const ratio = ASPECT_RATIOS[shape];
  const aspectRatio = ratio.width / ratio.height;

  if (shape === "circle") {
    const minContent = MIN_CONTENT_SIZE + CIRCLE_PADDING;
    return {
      width: minContent + CIRCLE_PADDING,
      height: minContent + CIRCLE_PADDING + CONTROLS_HEIGHT,
    };
  } else {
    // For rectangles, maintain aspect ratio with minimum content
    const minHeight = MIN_CONTENT_SIZE + CONTROLS_HEIGHT;
    const minWidth = minHeight * aspectRatio;
    return { width: minWidth, height: minHeight };
  }
}

/**
 * Calculate dimensions maintaining aspect ratio
 */
function calculateAspectRatioSize(
  shape: WebcamShape,
  baseDimension: number,
  isWidth: boolean
): { width: number; height: number } {
  const ratio = ASPECT_RATIOS[shape];
  const aspectRatio = ratio.width / ratio.height;

  if (isWidth) {
    return {
      width: baseDimension,
      height: baseDimension / aspectRatio,
    };
  } else {
    return {
      width: baseDimension * aspectRatio,
      height: baseDimension,
    };
  }
}

/**
 * Opens a Document Picture-in-Picture window with camera feed
 * @param stream - Webcam MediaStream to display
 * @param options - Window options and callbacks
 * @returns The PiP window or null if not supported/failed
 */
export async function openCameraPiPWindow(
  stream: MediaStream,
  options: CameraPiPWindowOptions = {}
): Promise<Window | null> {
  const { size = "medium", shape = "circle", onClose, onResize, onPause, onResume, onStop, onRestart } = options;
  const preset = SIZE_PRESETS[size];
  const aspectRatio = ASPECT_RATIOS[shape].width / ASPECT_RATIOS[shape].height;
  
  // Calculate initial window size maintaining aspect ratio
  const baseSize = Math.min(preset.width, preset.height);
  let initialWidth = baseSize * Math.sqrt(aspectRatio);
  let initialHeight = baseSize / Math.sqrt(aspectRatio);
  
  // Ensure minimum size
  const minSize = getMinimumSize(shape);
  if (initialWidth < minSize.width) {
    initialWidth = minSize.width;
    initialHeight = initialWidth / aspectRatio;
  }
  if (initialHeight < minSize.height) {
    initialHeight = minSize.height;
    initialWidth = initialHeight * aspectRatio;
  }

  if (!isPictureInPictureSupported()) {
    console.warn("Document Picture-in-Picture API not supported");
    return null;
  }

  try {
    // PiP window position cannot be set by the page (moveTo/moveBy are disabled by the spec).
    // The user agent chooses placement; Chrome defaults to bottom-right. The user can drag
    // the window to their preferred corner (e.g. bottom-left) and the browser will remember it.
    const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
      width: initialWidth,
      height: initialHeight,
    });

    let currentSize: "small" | "medium" | "large" = size;
    let currentShape: WebcamShape = shape;
    let lastWindowWidth = initialWidth;
    let lastWindowHeight = initialHeight;

    // Generate shape-specific CSS
    const isCircle = shape === "circle";
    const isRectangle = shape === "square" || shape === "mobile" || shape === "laptop" || shape === "classic";
    const shapeClass = isCircle ? "circle" : shape;
    const bodyPadding = isCircle ? "12px" : "0";
    const aspectRatio = ASPECT_RATIOS[shape];
    const aspectRatioValue = aspectRatio.width / aspectRatio.height;
    
    // Background: transparent for non-circle shapes, gradient for circle
    const bodyBackground = isCircle 
      ? "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)"
      : "transparent";
    
    const containerStyles = isCircle
      ? "width: 100%; height: 100%; max-width: calc(100% - 24px); max-height: calc(100% - 48px);"
      : "width: 100%; height: 100%; max-width: 100%; max-height: 100%;";
    
    const videoWrapperStyles = isCircle
      ? "width: calc(100% - 24px); height: calc(100% - 24px); border-radius: 50%; max-width: calc(100% - 24px); max-height: calc(100% - 24px);"
      : "width: 100%; height: 100%; border-radius: 0;";
    
    const containerAspectRatio = isCircle ? "aspect-ratio: 1;" : `aspect-ratio: ${aspectRatio.width} / ${aspectRatio.height};`;

    // Setup HTML structure with shape-specific styling
    pipWindow.document.documentElement.innerHTML = `
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Camera Preview</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: ${bodyBackground};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: ${bodyPadding};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            cursor: move;
            user-select: none;
          }
          .container {
            position: relative;
            ${containerStyles}
            display: flex;
            align-items: center;
            justify-content: center;
            ${containerAspectRatio}
          }
          .video-wrapper {
            position: relative;
            ${videoWrapperStyles}
            overflow: hidden;
            box-shadow: 
              0 0 0 3px rgba(255, 255, 255, 0.1),
              0 8px 32px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(0, 0, 0, 0.2) inset;
            background: rgba(0, 0, 0, 0.3);
          }
          video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .controls {
            position: absolute;
            bottom: 8px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 6px;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            padding: 6px 10px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            pointer-events: auto;
            cursor: default;
            z-index: 10;
            opacity: 0;
            transition: opacity 0.2s ease;
          }
          body:hover .controls {
            opacity: 1;
          }
          .control-btn {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.8);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 32px;
            height: 24px;
          }
          .control-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 1);
          }
          .control-btn.active {
            background: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 1);
          }
          .recording-controls {
            position: absolute;
            bottom: 8px;
            left: 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            padding: 6px 8px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            pointer-events: auto;
            cursor: default;
            z-index: 10;
            opacity: 0;
            transition: opacity 0.2s ease;
          }
          body:hover .recording-controls {
            opacity: 1;
          }
          .recording-controls .control-btn {
            min-width: 28px;
            height: 28px;
            font-size: 12px;
          }
          .recording-indicator {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 12px;
            height: 12px;
            background: #ef4444;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
            animation: pulse 2s ease-in-out infinite;
            pointer-events: none;
            z-index: 10;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
          }
        </style>
      </head>
      <body class="${shapeClass}">
        <div class="container">
          <div class="video-wrapper">
            <video autoplay muted playsinline></video>
            <div class="recording-indicator" title="Recording"></div>
          </div>
        </div>
        <div class="controls">
          <button class="control-btn" data-size="small" title="Small">S</button>
          <button class="control-btn active" data-size="medium" title="Medium">M</button>
          <button class="control-btn" data-size="large" title="Large">L</button>
        </div>
        <div class="recording-controls">
          <button class="control-btn" data-action="pause" title="Pause">⏸</button>
          <button class="control-btn" data-action="resume" title="Resume">▶</button>
          <button class="control-btn" data-action="stop" title="Stop">⏹</button>
          <button class="control-btn" data-action="restart" title="Restart">↻</button>
        </div>
      </body>
    `;

    // Get video element and set stream
    const video = pipWindow.document.querySelector("video") as HTMLVideoElement;
    const container = pipWindow.document.querySelector(".container") as HTMLElement;
    const videoWrapper = pipWindow.document.querySelector(".video-wrapper") as HTMLElement;
    const body = pipWindow.document.body;

    if (video) {
      video.srcObject = stream;
      video.play().catch((err) => {
        console.error("Failed to play video in PiP window:", err);
      });
    }

    // Wire recording control buttons
    const recordingActions: Array<{ action: string; fn?: () => void }> = [
      { action: "pause", fn: onPause },
      { action: "resume", fn: onResume },
      { action: "stop", fn: onStop },
      { action: "restart", fn: onRestart },
    ];
    recordingActions.forEach(({ action, fn }) => {
      const btn = pipWindow.document.querySelector(`.recording-controls [data-action="${action}"]`);
      if (btn && fn) {
        btn.addEventListener("click", () => fn());
      }
    });

    // Function to update CSS layout based on current window size and shape
    // This only updates CSS, does not resize the window
    const updateLayout = () => {
      try {
        const isCircle = currentShape === "circle";
        const isRectangle = currentShape === "square" || currentShape === "mobile" || currentShape === "laptop" || currentShape === "classic";
        const aspectRatio = ASPECT_RATIOS[currentShape];
        
        if (isCircle) {
          // Circle: centered with padding, maintain circular shape
          if (container) {
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.maxWidth = "calc(100% - 24px)";
            container.style.maxHeight = "calc(100% - 48px)";
            container.style.aspectRatio = "1";
          }
          if (videoWrapper) {
            videoWrapper.style.width = "calc(100% - 24px)";
            videoWrapper.style.height = "calc(100% - 24px)";
            videoWrapper.style.borderRadius = "50%";
            videoWrapper.style.maxWidth = "calc(100% - 24px)";
            videoWrapper.style.maxHeight = "calc(100% - 24px)";
          }
          if (body) {
            body.style.padding = "12px";
            body.style.background = "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)";
            body.className = "circle";
          }
        } else if (isRectangle) {
          // Rectangle shapes: edge-to-edge, no padding, fill entire window
          if (container) {
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.maxWidth = "100%";
            container.style.maxHeight = "100%";
            container.style.aspectRatio = `${aspectRatio.width} / ${aspectRatio.height}`;
          }
          if (videoWrapper) {
            videoWrapper.style.width = "100%";
            videoWrapper.style.height = "100%";
            videoWrapper.style.borderRadius = "0";
            videoWrapper.style.maxWidth = "100%";
            videoWrapper.style.maxHeight = "100%";
          }
          if (body) {
            body.style.padding = "0";
            body.style.background = "transparent";
            body.className = currentShape;
          }
        }
      } catch (error) {
        console.debug("Error updating layout:", error);
      }
    };

    // Initial layout update
    updateLayout();

    // Implement drag functionality
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let windowStartX = 0;
    let windowStartY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      // Don't start drag if clicking on controls
      if ((e.target as HTMLElement).closest('.controls') || (e.target as HTMLElement).closest('.recording-controls')) {
        return;
      }
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      try {
        windowStartX = pipWindow.screenX;
        windowStartY = pipWindow.screenY;
      } catch (error) {
        // screenX/screenY may not be available
        console.debug("Could not get window position:", error);
      }
      pipWindow.document.body.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;
      try {
        pipWindow.moveTo(windowStartX + deltaX, windowStartY + deltaY);
      } catch (error) {
        // moveTo may not be available, ignore
        console.debug("Could not move window:", error);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        pipWindow.document.body.style.cursor = 'move';
      }
    };

    pipWindow.document.body.addEventListener('mousedown', handleMouseDown);
    pipWindow.document.addEventListener('mousemove', handleMouseMove);
    pipWindow.document.addEventListener('mouseup', handleMouseUp);
    pipWindow.document.addEventListener('mouseleave', handleMouseUp);

    // Handle window resize events (manual resizing via corner/edge drag)
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    let isResizing = false;
    
    pipWindow.addEventListener('resize', () => {
      // Debounce resize events
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        if (isResizing) return; // Prevent recursive resizing
        
        const windowWidth = pipWindow.innerWidth;
        const windowHeight = pipWindow.innerHeight;
        
        // Detect which dimension changed
        const widthChanged = Math.abs(windowWidth - lastWindowWidth) > Math.abs(windowHeight - lastWindowHeight);
        const minSize = getMinimumSize(currentShape);
        
        // Enforce minimum size
        if (windowWidth < minSize.width || windowHeight < minSize.height) {
          isResizing = true;
          const newWidth = Math.max(windowWidth, minSize.width);
          const newHeight = Math.max(windowHeight, minSize.height);
          // Recalculate to maintain aspect ratio
          const aspectRatio = ASPECT_RATIOS[currentShape].width / ASPECT_RATIOS[currentShape].height;
          let finalWidth = newWidth;
          let finalHeight = newHeight;
          
          if (widthChanged) {
            finalHeight = finalWidth / aspectRatio;
            if (finalHeight < minSize.height) {
              finalHeight = minSize.height;
              finalWidth = finalHeight * aspectRatio;
            }
          } else {
            finalWidth = finalHeight * aspectRatio;
            if (finalWidth < minSize.width) {
              finalWidth = minSize.width;
              finalHeight = finalWidth / aspectRatio;
            }
          }
          
          try {
            pipWindow.resizeTo(finalWidth, finalHeight);
            lastWindowWidth = finalWidth;
            lastWindowHeight = finalHeight;
            setTimeout(() => { isResizing = false; }, 100);
          } catch (error) {
            console.debug("Could not enforce minimum size:", error);
            isResizing = false;
          }
          return;
        }
        
        // Maintain aspect ratio for all shapes
        const aspectRatio = ASPECT_RATIOS[currentShape].width / ASPECT_RATIOS[currentShape].height;
        const expectedHeight = windowWidth / aspectRatio;
        const expectedWidth = windowHeight * aspectRatio;
        
        // Check if aspect ratio is violated
        const heightDiff = Math.abs(windowHeight - expectedHeight);
        const widthDiff = Math.abs(windowWidth - expectedWidth);
        
        if (heightDiff > 2 || widthDiff > 2) {
          // Aspect ratio violated, correct it
          isResizing = true;
          let finalWidth: number;
          let finalHeight: number;
          
          if (widthChanged) {
            // Width changed, calculate height
            finalWidth = windowWidth;
            finalHeight = windowWidth / aspectRatio;
          } else {
            // Height changed, calculate width
            finalHeight = windowHeight;
            finalWidth = windowHeight * aspectRatio;
          }
          
          // Ensure minimum size
          if (finalWidth < minSize.width) {
            finalWidth = minSize.width;
            finalHeight = finalWidth / aspectRatio;
          }
          if (finalHeight < minSize.height) {
            finalHeight = minSize.height;
            finalWidth = finalHeight * aspectRatio;
          }
          
          try {
            pipWindow.resizeTo(finalWidth, finalHeight);
            lastWindowWidth = finalWidth;
            lastWindowHeight = finalHeight;
            setTimeout(() => { isResizing = false; }, 100);
          } catch (error) {
            console.debug("Could not maintain aspect ratio:", error);
            isResizing = false;
          }
          return;
        }
        
        lastWindowWidth = windowWidth;
        lastWindowHeight = windowHeight;
        
        // Update CSS layout to match new window size
        updateLayout();
      }, 50);
    });

    // Handle resize buttons
    const resizeButtons = Array.from(
      pipWindow.document.querySelectorAll(".control-btn[data-size]")
    ) as HTMLElement[];
    resizeButtons.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const newSize = btn.dataset.size as "small" | "medium" | "large";
        if (newSize === currentSize) return;

        // Update active state
        resizeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        currentSize = newSize;
        const newPreset = SIZE_PRESETS[newSize];
        const aspectRatio = ASPECT_RATIOS[currentShape].width / ASPECT_RATIOS[currentShape].height;
        const minSize = getMinimumSize(currentShape);
        
        // Calculate size maintaining aspect ratio
        // Use the smaller dimension from preset as base, then calculate the other dimension
        const baseSize = Math.min(newPreset.width, newPreset.height);
        let finalWidth = baseSize * Math.sqrt(aspectRatio);
        let finalHeight = baseSize / Math.sqrt(aspectRatio);
        
        // Ensure minimum size
        if (finalWidth < minSize.width) {
          finalWidth = minSize.width;
          finalHeight = finalWidth / aspectRatio;
        }
        if (finalHeight < minSize.height) {
          finalHeight = minSize.height;
          finalWidth = finalHeight * aspectRatio;
        }

        // Resize the window
        try {
          isResizing = true;
          pipWindow.resizeTo(finalWidth, finalHeight);
          lastWindowWidth = finalWidth;
          lastWindowHeight = finalHeight;
          updateLayout();
          setTimeout(() => { isResizing = false; }, 100);
          onResize?.(newSize);
        } catch (error) {
          console.error("Failed to resize PiP window:", error);
          isResizing = false;
        }
      });
    });

    // Handle window close
    pipWindow.addEventListener("pagehide", () => {
      if (video && video.srcObject) {
        // Don't stop the stream here - let the caller handle cleanup
        video.srcObject = null;
      }
      onClose?.();
    });

    return pipWindow;
  } catch (error) {
    console.error("Failed to open Picture-in-Picture window:", error);
    return null;
  }
}

/**
 * Closes a Picture-in-Picture window
 * @param pipWindow - The PiP window to close
 */
export function closeCameraPiPWindow(pipWindow: Window | null): void {
  if (pipWindow && !pipWindow.closed) {
    try {
      pipWindow.close();
    } catch (error) {
      console.error("Failed to close PiP window:", error);
    }
  }
}
