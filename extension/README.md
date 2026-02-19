# ClipCraft Recording Overlay Extension

This Chrome extension shows the **recording controls** (timer, pause/resume, stop, restart) and your **face camera** on **every browser tab** while you record with ClipCraft. Switch to any tab and you still see the same overlay.

## Installation (development)

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `extension` folder in this repo.
4. Keep the extension enabled while using ClipCraft.
5. **First time setup**: When you start recording, Chrome will prompt you to allow camera access for the extension. This is required for the extension to independently capture webcam frames (avoiding background tab throttling issues).

## How it works

- When you start a recording on the ClipCraft record page, the extension:
  1. Opens an **offscreen document** that independently captures your webcam at high quality (480px, 20 FPS)
  2. Injects a small overlay into **every open tab** (and into new tabs you open during the recording)
  3. Streams webcam frames from the offscreen document to all overlay instances
- The overlay shows a translucent control bar (left side) with timer and controls, plus a draggable camera bubble (bottom-left by default)
- Pause, resume, stop, and restart from any tab; the ClipCraft record page responds to these actions
- When you stop the recording or close the ClipCraft tab, the overlay is removed from all tabs and the offscreen document is closed

## Architecture

The extension uses an **Offscreen Document** API to capture webcam frames independently of the ClipCraft tab. This eliminates background tab throttling issues and ensures smooth 20 FPS video quality across all tabs, matching the native quality you see in the ClipCraft app.

**Key improvements over previous version:**
- ✅ No background tab throttling (offscreen document runs independently)
- ✅ Higher quality (480px resolution, WebP encoding, 20 FPS)
- ✅ Smooth rendering (canvas + createImageBitmap instead of img swaps)
- ✅ CSS isolation (Shadow DOM prevents style conflicts)

## Permissions

- **Camera**: Required for the extension to independently capture webcam frames via the offscreen document. You'll be prompted once when recording starts.
- **Tabs**: Required to inject overlays into all browser tabs.
- **Scripting**: Required to inject content scripts.
- **Offscreen**: Required for the offscreen document API.

The extension does **not** request screen access - that's handled by the ClipCraft website.

## Supported origins

The bridge that connects the ClipCraft app to the extension runs on:

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `https://*.vercel.app`
- (Production domain to be added when ready)

To support another production domain, add it to `content_scripts[0].matches` in `manifest.json`.

## Packaging for Chrome Web Store

1. **Generate icons** (if needed):
   - Open `generate-icons.html` in a browser
   - Click "Generate Icons" and save each icon to `icons/` folder

2. **Create ZIP package**:
   ```bash
   cd extension
   zip -r clipcraft-extension.zip . -x "*.git*" "*.DS_Store" "generate-icons.html"
   ```

3. **Chrome Web Store submission**:
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Create new item
   - Upload `clipcraft-extension.zip`
   - Fill in store listing details:
     - Name: ClipCraft Recording Overlay
     - Description: Show recording controls and camera on all tabs while recording with ClipCraft
     - Category: Productivity
     - Screenshots: Add screenshots showing the overlay in action
     - Privacy policy URL: Required (extension accesses camera)
   - Submit for review

## Development

- `background.js`: Service worker managing offscreen document and message routing
- `offscreen.js`: Offscreen document capturing webcam frames
- `content/overlay.js`: Content script injected into all tabs (Shadow DOM + canvas rendering)
- `content/bridge.js`: Content script on ClipCraft origin forwarding messages
- `popup.html/js/css`: Extension popup showing recording status
