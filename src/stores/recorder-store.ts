import { create } from "zustand";
import type {
  RecorderConfig,
  RecordingState,
  DeviceInfo,
  QualityPreset,
  WebcamPosition,
  WebcamShape,
  CaptureSource,
} from "@/types/recorder";

interface RecorderState {
  state: RecordingState;
  config: RecorderConfig;
  devices: { video: DeviceInfo[]; audio: DeviceInfo[] };
  sessionId: string | null;
  startTime: number | null;
  pausedDurationMs: number;
  pauseStart: number | null;
  error: string | null;

  setState: (state: RecordingState) => void;
  setConfig: (patch: Partial<RecorderConfig>) => void;
  setDevices: (devices: { video: DeviceInfo[]; audio: DeviceInfo[] }) => void;
  setSessionId: (id: string | null) => void;
  setStartTime: (t: number | null) => void;
  setPausedDurationMs: (ms: number) => void;
  setPauseStart: (t: number | null) => void;
  setError: (err: string | null) => void;
  reset: () => void;
}

const defaultConfig: RecorderConfig = {
  captureSource: "screen",
  webcamEnabled: true,
  webcamPosition: "bottom-right",
  webcamShape: "circle",
  micEnabled: true,
  quality: "1080p",
  videoDeviceId: null,
  audioDeviceId: null,
};

export const useRecorderStore = create<RecorderState>((set) => ({
  state: "idle",
  config: defaultConfig,
  devices: { video: [], audio: [] },
  sessionId: null,
  startTime: null,
  pausedDurationMs: 0,
  pauseStart: null,
  error: null,

  setState: (state) => set({ state }),
  setConfig: (patch) =>
    set((s) => ({ config: { ...s.config, ...patch } })),
  setDevices: (devices) => set({ devices }),
  setSessionId: (sessionId) => set({ sessionId }),
  setStartTime: (startTime) => set({ startTime }),
  setPausedDurationMs: (pausedDurationMs) => set({ pausedDurationMs }),
  setPauseStart: (pauseStart) => set({ pauseStart }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      state: "idle",
      config: defaultConfig,
      sessionId: null,
      startTime: null,
      pausedDurationMs: 0,
      pauseStart: null,
      error: null,
    }),
}));
