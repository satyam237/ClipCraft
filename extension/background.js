/**
 * ClipCraft extension background: manages offscreen document for webcam capture
 * and coordinates overlay injection across all tabs.
 */

const CLIPCRAFT_OVERLAY_SCRIPT = "content/overlay.js";
const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";

let recordTabId = null;
let recordingState = {
  elapsedMs: 0,
  isPaused: false,
  webcamEnabled: false,
  webcamShape: "circle",
};
let offscreenDocumentId = null;
let framePorts = new Set(); // Ports connected from content scripts for frame delivery
let overlayTabIds = new Set(); // Tab IDs that have an overlay port connection
let offscreenFrameDebugCount = 0; // Small debug counter for initial frames
let offscreenPortRef = null; // Port connected from offscreen document

// Check if offscreen document already exists
async function hasOffscreenDocument() {
  // Prefer modern API when available (Chrome 114+)
  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)],
    });
    if (contexts && contexts.length > 0) {
      return true;
    }
  }

  // Fallback for older Chrome versions
  const allClients = await self.clients.matchAll();
  return allClients.some((client) => client.url.includes(OFFSCREEN_DOCUMENT_PATH));
}

// Create offscreen document if it doesn't exist
async function setupOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ["USER_MEDIA"],
    justification: "Capture webcam frames for ClipCraft recording overlay",
  });
}

// Close offscreen document
async function closeOffscreenDocument() {
  if (offscreenPortRef) {
    offscreenPortRef.disconnect();
    offscreenPortRef = null;
  }
  if (await hasOffscreenDocument()) {
    try {
      await chrome.offscreen.closeDocument();
    } catch (e) {
      // Ignore "No current offscreen document" - document may already be closed
      if (!e?.message?.includes("No current offscreen document")) {
        console.error("[ClipCraft Background] closeOffscreenDocument error:", e);
      }
    }
  }
  offscreenDocumentId = null;
}

// Queue for messages to send once offscreen document connects
let pendingOffscreenMessages = [];

// Send message to offscreen document via port
async function sendToOffscreen(message) {
  if (!(await hasOffscreenDocument())) {
    await setupOffscreenDocument();
    // Wait a bit for offscreen document to initialize and connect
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  
  // Send via the port reference (set by onConnect handler)
  if (offscreenPortRef) {
    offscreenPortRef.postMessage(message);
  } else {
    // Queue message if port not connected yet
    pendingOffscreenMessages.push(message);
  }
}

async function injectOverlayIntoTab(tabId, options = {}) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [CLIPCRAFT_OVERLAY_SCRIPT],
    });
    
    // Send initial message via sendMessage (one-shot)
    // Port connection will be established by overlay.js when it loads
    const payload = {
      elapsedMs: options.elapsedMs ?? recordingState.elapsedMs,
      isPaused: options.isPaused ?? recordingState.isPaused,
      webcamEnabled: options.webcamEnabled ?? recordingState.webcamEnabled,
      webcamShape: options.webcamShape ?? recordingState.webcamShape,
    };

    await chrome.tabs
      .sendMessage(tabId, {
        type: "clipcraft-show-overlay",
        payload,
      })
      .catch(() => {
        // Tab may not be ready yet or doesn't allow messaging; retry once after a short delay
        setTimeout(() => {
          chrome.tabs
            .sendMessage(tabId, {
              type: "clipcraft-show-overlay",
              payload,
            })
            .catch(() => {});
        }, 500);
      });
  } catch (e) {
    // Tab may not allow scripting (e.g. chrome://); ignore
  }
}

function removeOverlayFromTab(tabId) {
  chrome.tabs.sendMessage(tabId, { type: "clipcraft-hide-overlay" }).catch(() => {});
}

async function injectOverlayIntoAllTabs(options = {}) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id === recordTabId) continue;
    if (tab.id && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("edge://")) {
      await injectOverlayIntoTab(tab.id, options);
    }
  }
}

function broadcastToAllTabs(message) {
  framePorts.forEach((port) => {
    try {
      port.postMessage(message);
    } catch (e) {
      // Port may be disconnected
      framePorts.delete(port);
    }
  });
  
  // Also send via sendMessage for tabs that haven't connected via port yet
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id === recordTabId) return;
      if (
        tab.id &&
        tab.url &&
        !tab.url.startsWith("chrome://") &&
        !tab.url.startsWith("edge://") &&
        !overlayTabIds.has(tab.id)
      ) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      }
    });
  });
}

async function clearRecording() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) removeOverlayFromTab(tab.id);
    });
  });
  
  framePorts.clear();
  await closeOffscreenDocument();
  recordTabId = null;
}

// Listen for connections from content scripts (for frame delivery)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "overlay-to-background") {
    framePorts.add(port);
    const tabId = port.sender && port.sender.tab && port.sender.tab.id;
    if (tabId != null) {
      overlayTabIds.add(tabId);
    }

    // If background has no active recording but an overlay connects,
    // immediately tell it to hide to avoid ghost overlays after restart.
    if (recordTabId == null) {
      try {
        port.postMessage({ type: "clipcraft-hide-overlay" });
      } catch (e) {
        // Ignore; port may already be disconnecting
      }
    }
    
    port.onMessage.addListener((message) => {
      if (message.source === "clipcraft-overlay" && message.kind === "overlay-action") {
        const action = message.payload?.action;
        if (recordTabId != null && action) {
          chrome.tabs.sendMessage(recordTabId, { type: "clipcraft-recorder-action", action }).catch(() => {});
        }
      }
    });
    
    port.onDisconnect.addListener(() => {
      framePorts.delete(port);
      if (tabId != null) {
        overlayTabIds.delete(tabId);
      }
    });
  }
  
  if (port.name === "offscreen-to-background") {
    // Store reference to offscreen port
    offscreenPortRef = port;
    
    // Send any pending messages
    while (pendingOffscreenMessages.length > 0) {
      const msg = pendingOffscreenMessages.shift();
      port.postMessage(msg);
    }
    
    // Handle messages from offscreen document
    port.onMessage.addListener((message) => {
      if (message.type === "frame") {
        // Broadcast frame to all overlay tabs
        offscreenFrameDebugCount++;
        if (offscreenFrameDebugCount <= 3) {
          console.log(
            "[ClipCraft Background] Broadcasting frame",
            offscreenFrameDebugCount,
            "to",
            framePorts.size,
            "tabs"
          );
        }
        broadcastToAllTabs({ type: "clipcraft-overlay-frame", payload: { dataUrl: message.dataUrl } });
      } else if (message.type === "capture-error") {
        console.error("[ClipCraft Background] Offscreen capture error:", message.error);
        broadcastToAllTabs({ type: "clipcraft-overlay-error", payload: { error: message.error } });
      }
    });
    
    port.onDisconnect.addListener(() => {
      offscreenPortRef = null;
      pendingOffscreenMessages = []; // Clear pending messages on disconnect
    });
  }
});

// Handle messages from content scripts and pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle popup state requests
  if (message.type === "popup-get-state") {
    sendResponse({
      state: {
        isRecording: recordTabId != null,
        isPaused: recordingState.isPaused,
        elapsedMs: recordingState.elapsedMs,
      },
    });
    return true;
  }

  const fromOverlay = message.source === "clipcraft-overlay";
  if (fromOverlay) {
    if (message.kind === "overlay-action") {
      const action = message.payload?.action;
      if (recordTabId != null && action) {
        chrome.tabs.sendMessage(recordTabId, { type: "clipcraft-recorder-action", action }).catch(() => {});
      }
      sendResponse({ ok: true });
    }
    return true;
  }

  const fromPage = message.source === "clipcraft-page";
  if (!fromPage) return;

  const { kind, payload } = message;

  if (kind === "recording-started") {
    recordTabId = sender.tab?.id ?? null;
    recordingState = {
      elapsedMs: payload?.elapsedMs ?? 0,
      isPaused: payload?.isPaused ?? false,
      webcamEnabled: payload?.webcamEnabled ?? false,
      webcamShape: payload?.webcamShape ?? "circle",
    };
    
    // Start webcam capture in offscreen document if enabled
    if (recordingState.webcamEnabled) {
      console.log("[ClipCraft Background] Starting webcam capture, deviceId:", payload?.deviceId);
      setupOffscreenDocument().then(() => {
        sendToOffscreen({
          type: "start-capture",
          deviceId: payload?.deviceId || null, // Allow null for default camera
        });
      }).catch((err) => {
        console.error("[ClipCraft Background] Failed to setup offscreen document:", err);
      });
    } else {
      console.log("[ClipCraft Background] Webcam not enabled, skipping capture");
    }
    
    // Notify popup
    chrome.runtime.sendMessage({
      type: "popup-state-update",
      payload: {
        isRecording: true,
        isPaused: false,
        elapsedMs: 0,
      },
    }).catch(() => {});
    
    injectOverlayIntoAllTabs(recordingState).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (kind === "recording-state") {
    recordingState = { ...recordingState, ...(payload ?? {}) };
    broadcastToAllTabs({
      type: "clipcraft-overlay-state",
      payload: { elapsedMs: recordingState.elapsedMs, isPaused: recordingState.isPaused },
    });
    // Notify popup if open
    chrome.runtime.sendMessage({
      type: "popup-state-update",
      payload: {
        isRecording: true,
        isPaused: recordingState.isPaused,
        elapsedMs: recordingState.elapsedMs,
      },
    }).catch(() => {});
    sendResponse({ ok: true });
    return false;
  }

  if (kind === "recording-stopped") {
    clearRecording()
      .then(() => {
        // Notify popup after recording has been fully cleared
        chrome.runtime.sendMessage({
          type: "popup-state-update",
          payload: {
            isRecording: false,
            isPaused: false,
            elapsedMs: 0,
          },
        }).catch(() => {});
      })
      .finally(() => {
        sendResponse({ ok: true });
      });
    return true;
  }

  return false;
});

// When a new tab loads, inject overlay if we're recording
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (recordTabId == null) return;
  if (tabId === recordTabId) return;
  if (changeInfo.status !== "complete") return;
  if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) return;
  injectOverlayIntoTab(tabId, recordingState).catch(() => {});
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === recordTabId) {
    clearRecording().catch(() => {});
  }
});
