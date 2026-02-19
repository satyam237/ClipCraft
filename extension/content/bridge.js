/**
 * ClipCraft bridge: runs only on ClipCraft origin.
 * 1) Listens for postMessage from the page (recording-started/stopped/state) and forwards to extension.
 * 2) Listens for messages from extension (recorder actions) and dispatches custom events to the page.
 */

(function () {
  const CLIPCRAFT_FROM_PAGE = "clipcraft-from-page";

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== CLIPCRAFT_FROM_PAGE || !data.payload) return;

    const { kind, ...rest } = data.payload;
    if (!kind) return;

    // Only forward start/stop/state messages (no frame data)
    if (kind === "recording-started" || kind === "recording-stopped" || kind === "recording-state") {
      chrome.runtime.sendMessage({
        source: "clipcraft-page",
        kind,
        payload: rest,
      });
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
