/**
 * ClipCraft overlay: injected into every tab when recording.
 * Shows control bar + draggable face cam with hover menu.
 * Uses Shadow DOM for CSS isolation and canvas + createImageBitmap for smooth rendering.
 */

(function () {
  if (window.__clipcraftOverlayLoaded) return;
  window.__clipcraftOverlayLoaded = true;

  // Embedded CSS for Shadow DOM
  const OVERLAY_CSS = `
    .clipcraft-overlay-root {
      all: initial;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483647;
    }
    .clipcraft-overlay-root * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    .clipcraft-control-bar {
      pointer-events: auto;
      position: fixed;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(18, 18, 18, 0.78);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
    }
    .clipcraft-timer {
      min-width: 56px;
      text-align: center;
      font-size: 14px;
      font-variant-numeric: tabular-nums;
      color: #f87171;
      line-height: 1.4;
    }
    .clipcraft-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.12);
      color: #e5e5e5;
      cursor: pointer;
      transition: background 0.15s;
    }
    .clipcraft-btn:hover {
      background: rgba(255, 255, 255, 0.22);
    }
    .clipcraft-btn.stop {
      background: rgba(239, 68, 68, 0.85);
      border-color: rgba(248, 113, 113, 0.4);
      color: #fff;
    }
    .clipcraft-btn.stop:hover {
      background: rgba(220, 38, 38, 0.95);
    }
    .clipcraft-btn svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }
    .clipcraft-camera-wrap {
      pointer-events: auto;
      position: fixed;
      left: 16px;
      bottom: 24px;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      overflow: visible;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
    }
    .clipcraft-camera-wrap:active {
      cursor: grabbing;
    }
    .clipcraft-camera-canvas {
      width: 100%;
      height: 100%;
      display: block;
      border-radius: 50%;
      border: 2.5px solid rgba(255, 255, 255, 0.35);
      background: rgba(0, 0, 0, 0.5);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
    }
    .clipcraft-camera-canvas.hidden {
      display: none;
    }
    .clipcraft-profile-icon {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 2.5px solid rgba(255, 255, 255, 0.35);
      background: rgba(30, 30, 30, 0.85);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
      color: rgba(255, 255, 255, 0.7);
    }
    .clipcraft-profile-icon svg {
      width: 40%;
      height: 40%;
    }
    .clipcraft-camera-menu {
      pointer-events: auto;
      position: absolute;
      bottom: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 6px;
      background: rgba(18, 18, 18, 0.9);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
      white-space: nowrap;
      min-width: 140px;
    }
    .clipcraft-camera-wrap:hover .clipcraft-camera-menu {
      opacity: 1;
      visibility: visible;
    }
    .clipcraft-menu-row {
      display: flex;
      gap: 3px;
    }
    .clipcraft-menu-btn {
      flex: 1;
      padding: 5px 8px;
      font-size: 11px;
      font-family: inherit;
      color: #ccc;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      cursor: pointer;
      text-align: center;
      transition: background 0.15s;
      line-height: 1.3;
    }
    .clipcraft-menu-btn:hover {
      background: rgba(255, 255, 255, 0.18);
      color: #fff;
    }
    .clipcraft-menu-btn.active {
      background: rgba(255, 255, 255, 0.22);
      color: #fff;
      border-color: rgba(255, 255, 255, 0.3);
    }
    .clipcraft-menu-btn.full {
      width: 100%;
    }
  `;

  let shadowRoot = null;
  let root = null;
  let state = { elapsedMs: 0, isPaused: false };
  let port = null;

  // Camera bubble state
  let cameraMode = "camera"; // "camera" | "profile" | "hidden"
  let cameraSize = "medium"; // "small" | "medium" | "large"
  const SIZES = { small: 120, medium: 180, large: 240 };

  // Canvas rendering state
  let cameraCanvas = null;
  let cameraCtx = null;
  let currentBitmap = null;
  let isRendering = false;

  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) {
      return h + ":" + String(m % 60).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
    }
    return m + ":" + String(s % 60).padStart(2, "0");
  }

  // SVGs
  var playSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  var pauseSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  var stopSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>';
  var restartSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';
  var personSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

  // ---- Control bar ----
  function buildControlBar() {
    var bar = document.createElement("div");
    bar.className = "clipcraft-control-bar";

    var timer = document.createElement("span");
    timer.className = "clipcraft-timer";
    timer.textContent = "\u25CF " + formatTime(state.elapsedMs);

    var pauseResume = document.createElement("button");
    pauseResume.className = "clipcraft-btn";
    pauseResume.title = state.isPaused ? "Resume" : "Pause";
    pauseResume.innerHTML = state.isPaused ? playSvg : pauseSvg;
    pauseResume.addEventListener("click", function () {
      if (port) {
        port.postMessage({ source: "clipcraft-overlay", kind: "overlay-action", payload: { action: state.isPaused ? "resume" : "pause" } });
      }
    });

    var stopBtn = document.createElement("button");
    stopBtn.className = "clipcraft-btn stop";
    stopBtn.title = "Stop";
    stopBtn.innerHTML = stopSvg;
    stopBtn.addEventListener("click", function () {
      if (port) {
        port.postMessage({ source: "clipcraft-overlay", kind: "overlay-action", payload: { action: "stop" } });
      }
    });

    var restartBtn = document.createElement("button");
    restartBtn.className = "clipcraft-btn";
    restartBtn.title = "Restart";
    restartBtn.innerHTML = restartSvg;
    restartBtn.addEventListener("click", function () {
      if (port) {
        port.postMessage({ source: "clipcraft-overlay", kind: "overlay-action", payload: { action: "restart" } });
      }
    });

    bar.appendChild(timer);
    bar.appendChild(pauseResume);
    bar.appendChild(stopBtn);
    bar.appendChild(restartBtn);

    function update() {
      timer.textContent = "\u25CF " + formatTime(state.elapsedMs);
      pauseResume.title = state.isPaused ? "Resume" : "Pause";
      pauseResume.innerHTML = state.isPaused ? playSvg : pauseSvg;
    }

    return { el: bar, update: update };
  }

  // ---- Camera bubble + hover menu ----
  function buildCameraBubble() {
    var wrap = document.createElement("div");
    wrap.className = "clipcraft-camera-wrap";

    // Canvas for smooth rendering
    cameraCanvas = document.createElement("canvas");
    cameraCanvas.className = "clipcraft-camera-canvas";
    cameraCtx = cameraCanvas.getContext("2d", { willReadFrequently: false });
    
    // Set canvas size before appending
    var px = SIZES[cameraSize] || SIZES.medium;
    cameraCanvas.width = px;
    cameraCanvas.height = px;
    
    wrap.appendChild(cameraCanvas);
    
    // Now apply size to wrap (which will also update canvas if needed)
    applyCameraSize(wrap);

    // Profile icon (shown in profile mode)
    var profileIcon = document.createElement("div");
    profileIcon.className = "clipcraft-profile-icon";
    profileIcon.innerHTML = personSvg;
    profileIcon.style.display = "none";
    wrap.appendChild(profileIcon);

    // Hover menu
    var menu = document.createElement("div");
    menu.className = "clipcraft-camera-menu";

    // Size buttons
    var sizeRow = document.createElement("div");
    sizeRow.className = "clipcraft-menu-row";
    ["small", "medium", "large"].forEach(function (sz) {
      var btn = document.createElement("button");
      btn.className = "clipcraft-menu-btn" + (sz === cameraSize ? " active" : "");
      btn.textContent = sz.charAt(0).toUpperCase() + sz.slice(1);
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        cameraSize = sz;
        applyCameraSize(wrap);
        sizeRow.querySelectorAll(".clipcraft-menu-btn").forEach(function (b) {
          b.className = "clipcraft-menu-btn" + (b.textContent.toLowerCase() === sz ? " active" : "");
        });
      });
      sizeRow.appendChild(btn);
    });
    menu.appendChild(sizeRow);

    // Toggle camera / profile icon
    var toggleBtn = document.createElement("button");
    toggleBtn.className = "clipcraft-menu-btn full";
    toggleBtn.textContent = "Show Profile Icon";
    toggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (cameraMode === "camera") {
        cameraMode = "profile";
        cameraCanvas.classList.add("hidden");
        profileIcon.style.display = "flex";
        toggleBtn.textContent = "Show Camera";
      } else {
        cameraMode = "camera";
        cameraCanvas.classList.remove("hidden");
        profileIcon.style.display = "none";
        toggleBtn.textContent = "Show Profile Icon";
      }
    });
    menu.appendChild(toggleBtn);

    // Hide camera bubble entirely
    var hideBtn = document.createElement("button");
    hideBtn.className = "clipcraft-menu-btn full";
    hideBtn.textContent = "Hide Camera";
    hideBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      cameraMode = "hidden";
      wrap.style.display = "none";
    });
    menu.appendChild(hideBtn);

    wrap.appendChild(menu);

    // ---- Dragging ----
    var dragState = null;
    wrap.addEventListener("mousedown", function (e) {
      if (e.target.closest(".clipcraft-camera-menu")) return;
      var rect = wrap.getBoundingClientRect();
      dragState = { startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top };
      e.preventDefault();
    });
    document.addEventListener("mousemove", function (e) {
      if (!dragState) return;
      var dx = e.clientX - dragState.startX;
      var dy = e.clientY - dragState.startY;
      var size = wrap.offsetWidth;
      var newLeft = Math.max(0, Math.min(window.innerWidth - size, dragState.origLeft + dx));
      var newTop = Math.max(0, Math.min(window.innerHeight - size, dragState.origTop + dy));
      wrap.style.left = newLeft + "px";
      wrap.style.top = newTop + "px";
      wrap.style.bottom = "auto";
    });
    document.addEventListener("mouseup", function () {
      dragState = null;
    });

    return { el: wrap, profileIcon: profileIcon };
  }

  function applyCameraSize(wrap) {
    var px = SIZES[cameraSize] || SIZES.medium;
    wrap.style.width = px + "px";
    wrap.style.height = px + "px";
    if (cameraCanvas) {
      cameraCanvas.width = px;
      cameraCanvas.height = px;
    }
  }

  // Smooth frame rendering with createImageBitmap
  async function updateFrame(dataUrl) {
    if (!cameraCanvas || !cameraCtx) {
      console.warn("[ClipCraft] Canvas not initialized");
      return;
    }
    if (cameraMode !== "camera") {
      return;
    }
    if (!dataUrl) {
      return;
    }
    if (isRendering) return; // Skip if already rendering

    isRendering = true;

    try {
      // Decode image off main thread
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const bitmap = await createImageBitmap(blob);

      // Double-buffer: decode next frame while displaying current
      if (currentBitmap) {
        currentBitmap.close();
      }
      currentBitmap = bitmap;

      // Ensure canvas has valid dimensions
      if (cameraCanvas.width === 0 || cameraCanvas.height === 0) {
        const px = SIZES[cameraSize] || SIZES.medium;
        cameraCanvas.width = px;
        cameraCanvas.height = px;
      }

      // Draw to canvas
      cameraCtx.clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);
      cameraCtx.drawImage(bitmap, 0, 0, cameraCanvas.width, cameraCanvas.height);
    } catch (error) {
      console.error("[ClipCraft] Frame render error:", error);
    } finally {
      isRendering = false;
    }
  }

  // ---- Globals ----
  var controlBarUpdate = null;

  // Connect to background script via port immediately when script loads
  port = chrome.runtime.connect({ name: "overlay-to-background" });

  port.onMessage.addListener(function (message) {
    if (message.type === "clipcraft-show-overlay") {
      show(message.payload);
    } else if (message.type === "clipcraft-hide-overlay") {
      hide();
    } else if (message.type === "clipcraft-overlay-state") {
      updateState(message.payload);
    } else if (message.type === "clipcraft-overlay-frame") {
      if (!window._frameCount) window._frameCount = 0;
      window._frameCount++;
      if (window._frameCount <= 3) {
        console.log("[ClipCraft Overlay] Received frame", window._frameCount, "size:", message.payload?.dataUrl?.length || 0);
      }
      updateFrame(message.payload ? message.payload.dataUrl : null);
    } else if (message.type === "clipcraft-overlay-error") {
      console.error("[ClipCraft] Overlay error:", message.payload?.error);
    }
  });

  port.onDisconnect.addListener(function () {
    port = null;
  });

  function show(payload) {
    if (payload) {
      if (typeof payload.elapsedMs === "number") state.elapsedMs = payload.elapsedMs;
      if (typeof payload.isPaused === "boolean") state.isPaused = payload.isPaused;
    }
    if (root) return;

    // Create shadow root for CSS isolation
    root = document.createElement("div");
    root.className = "clipcraft-overlay-root";
    shadowRoot = root.attachShadow({ mode: "closed" });

    // Inject CSS
    const style = document.createElement("style");
    style.textContent = OVERLAY_CSS;
    shadowRoot.appendChild(style);

    // Create container
    const container = document.createElement("div");
    container.className = "clipcraft-overlay-root";

    var bar = buildControlBar();
    controlBarUpdate = bar.update;
    container.appendChild(bar.el);

    var camera = buildCameraBubble();
    container.appendChild(camera.el);

    shadowRoot.appendChild(container);
    document.body.appendChild(root);
    
    // Test canvas rendering
    if (cameraCanvas && cameraCtx) {
      // Draw a test pattern to verify canvas works
      cameraCtx.fillStyle = "#333";
      cameraCtx.fillRect(0, 0, cameraCanvas.width, cameraCanvas.height);
      cameraCtx.fillStyle = "#666";
      cameraCtx.font = "12px sans-serif";
      cameraCtx.textAlign = "center";
      cameraCtx.fillText("Waiting for camera...", cameraCanvas.width / 2, cameraCanvas.height / 2);
    }
    
    console.log("[ClipCraft Overlay] Overlay shown, canvas:", {
      exists: !!cameraCanvas,
      width: cameraCanvas?.width,
      height: cameraCanvas?.height,
      mode: cameraMode,
      visible: cameraCanvas ? window.getComputedStyle(cameraCanvas).display !== "none" : false,
    });
  }

  function hide() {
    if (currentBitmap) {
      currentBitmap.close();
      currentBitmap = null;
    }
    if (port) {
      port.disconnect();
      port = null;
    }
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    shadowRoot = null;
    controlBarUpdate = null;
    cameraCanvas = null;
    cameraCtx = null;
    window.__clipcraftOverlayLoaded = false;
  }

  function updateState(payload) {
    if (payload) {
      if (typeof payload.elapsedMs === "number") state.elapsedMs = payload.elapsedMs;
      if (typeof payload.isPaused === "boolean") state.isPaused = payload.isPaused;
    }
    if (controlBarUpdate) controlBarUpdate();
  }

  // Listen for messages (fallback for tabs that haven't connected via port yet)
  chrome.runtime.onMessage.addListener(function (message) {
    if (message.type === "clipcraft-show-overlay") {
      show(message.payload);
    } else if (message.type === "clipcraft-hide-overlay") {
      hide();
    } else if (message.type === "clipcraft-overlay-state") {
      updateState(message.payload);
    } else if (message.type === "clipcraft-overlay-frame") {
      updateFrame(message.payload ? message.payload.dataUrl : null);
    } else if (message.type === "clipcraft-overlay-error") {
      console.error("[ClipCraft] Overlay error:", message.payload?.error);
    }
  });
})();
