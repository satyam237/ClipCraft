/**
 * ClipCraft extension popup: shows recording status
 */

let recordingState = {
  isRecording: false,
  isPaused: false,
  elapsedMs: 0,
};

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) {
    return h + ":" + String(m % 60).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  return m + ":" + String(s % 60).padStart(2, "0");
}

function updateUI() {
  const statusEl = document.getElementById("status");
  const timerEl = document.getElementById("timer");
  const timerValueEl = timerEl.querySelector(".timer-value");

  if (recordingState.isRecording) {
    statusEl.className = `status ${recordingState.isPaused ? "paused" : "recording"}`;
    statusEl.querySelector(".status-text").textContent = recordingState.isPaused
      ? "Recording paused"
      : "Recording";
    timerEl.style.display = "flex";
    timerValueEl.textContent = formatTime(recordingState.elapsedMs);
  } else {
    statusEl.className = "status idle";
    statusEl.querySelector(".status-text").textContent = "Not recording";
    timerEl.style.display = "none";
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "popup-state-update") {
    recordingState = { ...recordingState, ...message.payload };
    updateUI();
  }
});

// Request current state from background
chrome.runtime.sendMessage({ type: "popup-get-state" }, (response) => {
  if (chrome.runtime.lastError) {
    // Background not available or message failed; keep default UI
    return;
  }
  if (response && response.state) {
    recordingState = response.state;
    updateUI();
  }
});

// Update timer periodically when recording
setInterval(() => {
  if (recordingState.isRecording && !recordingState.isPaused) {
    recordingState.elapsedMs += 1000;
    updateUI();
  }
}, 1000);

// Initial UI update
updateUI();
