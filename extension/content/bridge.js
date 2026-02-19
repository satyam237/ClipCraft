/**
 * ClipCraft bridge: runs only on ClipCraft origin.
 * 1) Listens for postMessage from the page (recording-started/stopped/state) and forwards to extension.
 * 2) Listens for messages from extension (recorder actions) and dispatches custom events to the page.
 */

(function () {
  const CLIPCRAFT_FROM_PAGE = "clipcraft-from-page";
  const DEBUG = false;
  if (DEBUG) console.log("[ClipCraft Bridge] loaded", { runtimeId: chrome?.runtime?.id ?? null });

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== CLIPCRAFT_FROM_PAGE || !data.payload) return;

    const { kind, ...rest } = data.payload;
    if (!kind) return;

    // Only forward start/stop/state messages (no frame data)
    if (kind === "recording-started" || kind === "recording-stopped" || kind === "recording-state") {
      if (DEBUG && kind === "recording-started") {
        console.log("[ClipCraft Bridge] got recording-started from page");
      }
      if (!chrome?.runtime?.id) {
        // Extension context is unavailable (e.g. during reload/disable).
        return;
      }
      try {
        chrome.runtime.sendMessage(
          {
            source: "clipcraft-page",
            kind,
            payload: rest,
          },
          () => {
            // Avoid noisy console warnings when the background isn't ready (reload, update, etc.)
            const err = chrome.runtime.lastError;
            if (DEBUG && err && err.message && !err.message.includes("Receiving end does not exist")) {
              console.debug("[ClipCraft Bridge] sendMessage lastError:", err.message);
            }
          }
        );
      } catch (_e) {
        // Can happen if the extension was reloaded while this content script is still running:
        // "Uncaught Error: Extension context invalidated."
        if (DEBUG) console.debug("[ClipCraft Bridge] Extension context invalidated while sending", kind);
      }
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "clipcraft-recorder-action" && message.action) {
      window.dispatchEvent(
        new CustomEvent("clipcraft-recorder-action", { detail: { action: message.action } })
      );
    }
  });
})();
