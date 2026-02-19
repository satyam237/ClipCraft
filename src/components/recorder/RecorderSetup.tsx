"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRecorderStore } from "@/stores/recorder-store";
import { getVideoInputDevices, getAudioInputDevices } from "@/lib/recorder/media-capture";
import { isPictureInPictureSupported } from "@/lib/recorder/picture-in-picture";
import { CameraPreview } from "@/components/recorder/CameraPreview";
import type { CaptureSource, QualityPreset, WebcamPosition, WebcamShape } from "@/types/recorder";

const CAPTURE_OPTIONS: { value: CaptureSource; label: string }[] = [
  { value: "screen", label: "Entire screen" },
  { value: "window", label: "Window" },
  { value: "tab", label: "Browser tab" },
];

const QUALITY_OPTIONS: { value: QualityPreset; label: string }[] = [
  { value: "720p", label: "720p" },
  { value: "1080p", label: "1080p" },
];

const WEBCAM_POSITIONS: { value: WebcamPosition; label: string }[] = [
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
];

const IN_APP_SHAPES: WebcamShape[] = ["circle", "square"];

export function RecorderSetup({
  onStart,
  onCancel,
  isSetupPhase = true,
}: {
  onStart: () => void;
  onCancel: () => void;
  isSetupPhase?: boolean;
}) {
  const { config, setConfig, devices, setDevices } = useRecorderStore();
  const [loading, setLoading] = useState(false);
  // Resolve PiP support only after mount to avoid server/client HTML mismatch (hydration error).
  // On server and initial client render we use false so the same branch (non-PiP UI) is rendered.
  const [pipSupported, setPipSupported] = useState(false);
  useEffect(() => {
    setPipSupported(isPictureInPictureSupported());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [video, audio] = await Promise.all([
        getVideoInputDevices(),
        getAudioInputDevices(),
      ]);
      if (cancelled) return;
      setDevices({
        video: video.map((d) => ({ deviceId: d.deviceId, label: d.label || "Camera", kind: "videoinput" })),
        audio: audio.map((d) => ({ deviceId: d.deviceId, label: d.label || "Microphone", kind: "audioinput" })),
      });
    })();
    return () => { cancelled = true; };
  }, [setDevices]);

  return (
    <>
      {config.webcamEnabled && isSetupPhase && <CameraPreview config={config} devices={devices} />}
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Recording setup</CardTitle>
          <CardDescription>
            Choose what to record and your camera/mic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Capture</Label>
            <div className="flex gap-2 flex-wrap">
              {CAPTURE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={config.captureSource === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConfig({ captureSource: opt.value })}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Quality</Label>
            <div className="flex gap-2">
              {QUALITY_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={config.quality === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConfig({ quality: opt.value })}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="webcam"
              checked={config.webcamEnabled}
              onChange={(e) => setConfig({ webcamEnabled: e.target.checked })}
            />
            <Label htmlFor="webcam">Include webcam</Label>
          </div>
          {config.webcamEnabled && (
            <>
              {pipSupported && (
                <div className="border-b border-border/40 pb-3 mb-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="pip-window"
                      checked={config.usePiPWindow}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (!checked && !IN_APP_SHAPES.includes(config.webcamShape)) {
                          setConfig({ usePiPWindow: false, webcamShape: "circle" });
                        } else {
                          setConfig({ usePiPWindow: checked });
                        }
                      }}
                    />
                    <Label htmlFor="pip-window" className="font-medium">
                      Show camera in floating window (stays visible across tabs)
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    The window hovers over all windows and apps.
                  </p>
                </div>
              )}
              {config.usePiPWindow ? (
                <div className="space-y-2">
                  <Label>Webcam shape</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={config.webcamShape === "circle" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setConfig({ webcamShape: "circle" })}
                    >
                      Circle (1:1)
                    </Button>
                    <Button
                      type="button"
                      variant={config.webcamShape === "square" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setConfig({ webcamShape: "square" })}
                    >
                      Square (1:1)
                    </Button>
                    <Button
                      type="button"
                      variant={config.webcamShape === "mobile" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setConfig({ webcamShape: "mobile" })}
                    >
                      Mobile View (9:16)
                    </Button>
                    <Button
                      type="button"
                      variant={config.webcamShape === "laptop" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setConfig({ webcamShape: "laptop" })}
                    >
                      Laptop View (16:9)
                    </Button>
                    <Button
                      type="button"
                      variant={config.webcamShape === "classic" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setConfig({ webcamShape: "classic" })}
                    >
                      Classic View (3:4)
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Webcam position</Label>
                    <select
                      className="w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm"
                      value={config.webcamPosition}
                      onChange={(e) => setConfig({ webcamPosition: e.target.value as WebcamPosition })}
                    >
                      {WEBCAM_POSITIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Webcam shape</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={config.webcamShape === "circle" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setConfig({ webcamShape: "circle" })}
                      >
                        Circle
                      </Button>
                      <Button
                        type="button"
                        variant={config.webcamShape === "square" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setConfig({ webcamShape: "square" })}
                      >
                        Square
                      </Button>
                    </div>
                  </div>
                </>
              )}
              {devices.video.length > 0 && (
                <div className="space-y-2">
                  <Label>Camera</Label>
                  <select
                    className="w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm"
                    value={config.videoDeviceId ?? ""}
                    onChange={(e) => setConfig({ videoDeviceId: e.target.value || null })}
                  >
                    <option value="">Default</option>
                    {devices.video.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="mic"
              checked={config.micEnabled}
              onChange={(e) => setConfig({ micEnabled: e.target.checked })}
            />
            <Label htmlFor="mic">Include microphone</Label>
          </div>
          {config.micEnabled && devices.audio.length > 0 && (
            <div className="space-y-2">
              <Label>Microphone</Label>
              <select
                className="w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm"
                value={config.audioDeviceId ?? ""}
                onChange={(e) => setConfig({ audioDeviceId: e.target.value || null })}
              >
                <option value="">Default</option>
                {devices.audio.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onStart} disabled={loading}>
            {loading ? "Starting…" : "Start recording"}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
