export class CameraError extends Error {
  constructor(public readonly code: 'denied' | 'unavailable', message: string) {
    super(message);
  }
}

/** 전면 카메라를 열어 video에 연결. 반환된 스트림은 closeCamera로 반드시 닫는다. */
export async function openCamera(video: HTMLVideoElement): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('unavailable', 'getUserMedia 미지원');
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
      audio: false,
    });
  } catch (e) {
    const name = (e as DOMException).name;
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new CameraError('denied', name);
    throw new CameraError('unavailable', name);
  }
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await new Promise<void>((resolve) => {
    if (video.readyState >= 2) return resolve();
    video.onloadedmetadata = () => resolve();
  });
  await video.play();
  return stream;
}

/** 트랙을 모두 멈추고 연결을 끊는다. 여러 번 호출해도 안전. */
export function closeCamera(video: HTMLVideoElement): void {
  const stream = video.srcObject as MediaStream | null;
  if (stream) for (const t of stream.getTracks()) t.stop();
  video.srcObject = null;
}
