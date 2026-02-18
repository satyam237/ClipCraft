import type { CaptureSource } from "@/types/recorder";

export async function getDisplayMedia(
  source: CaptureSource,
  width: number,
  height: number
): Promise<MediaStream> {
  const displayMediaOptions: DisplayMediaStreamOptions = {
    video: {
      width: { ideal: width },
      height: { ideal: height },
      displaySurface: source === "tab" ? "browser" : source === "window" ? "window" : "monitor",
    },
    audio: false,
  };
  const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
  return stream;
}

export async function getUserMedia(
  videoDeviceId: string | null,
  audioDeviceId: string | null,
  enableVideo: boolean,
  enableAudio: boolean
): Promise<{ videoStream: MediaStream | null; audioStream: MediaStream | null }> {
  let videoStream: MediaStream | null = null;
  let audioStream: MediaStream | null = null;

  if (enableVideo) {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: videoDeviceId
        ? { deviceId: { exact: videoDeviceId } }
        : {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
      audio: false,
    });
  }

  if (enableAudio) {
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      video: false,
    });
  }

  return { videoStream, audioStream };
}

export async function getVideoInputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === "videoinput");
}

export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === "audioinput");
}

export function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((t) => t.stop());
}
