export type CaptureSource = "screen" | "window" | "tab";

export type WebcamPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export type WebcamShape = "circle" | "square" | "mobile" | "laptop" | "classic";

export type QualityPreset = "720p" | "1080p";

export interface RecorderConfig {
  captureSource: CaptureSource;
  webcamEnabled: boolean;
  webcamPosition: WebcamPosition;
  webcamShape: WebcamShape;
  micEnabled: boolean;
  quality: QualityPreset;
  videoDeviceId: string | null;
  audioDeviceId: string | null;
  usePiPWindow: boolean;
}

export type RecordingState = "idle" | "setting-up" | "recording" | "paused" | "stopping";

export interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: "videoinput" | "audioinput" | "audiooutput";
}
