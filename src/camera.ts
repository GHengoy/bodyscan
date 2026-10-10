export class CameraError extends Error {
  constructor(public readonly code: 'denied' | 'unavailable', message: string) {
    super(message);
  }
}

/** 권한 프롬프트·장치 응답 대기 상한 */
const GUM_TIMEOUT_MS = 20_000;

export type Facing = 'user' | 'environment';

/**
 * 카메라를 열어 video에 연결. 반환된 스트림은 closeCamera로 반드시 닫는다.
 * facing: 'user'(전면, 거울처럼 보여줌) | 'environment'(후면, 화각이 넓어 더 가까이서도 전신이 들어옴)
 */
export async function openCamera(video: HTMLVideoElement, facing: Facing = 'user'): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('unavailable', 'getUserMedia 미지원');
  let stream: MediaStream;
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const gum = navigator.mediaDevices.getUserMedia({
    video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 1280 } },
    audio: false,
  });
  // 타임아웃 뒤에 늦게 열린 스트림은 즉시 끈다(표시등이 켜진 채 남지 않도록)
  gum.then((s) => { if (timedOut) for (const t of s.getTracks()) t.stop(); }, () => {});
  try {
    stream = await Promise.race([
      gum,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          reject(new CameraError('unavailable', 'timeout'));
        }, GUM_TIMEOUT_MS);
      }),
    ]);
  } catch (e) {
    if (e instanceof CameraError) throw e;
    const name = (e as DOMException).name;
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new CameraError('denied', name);
    throw new CameraError('unavailable', name);
  } finally {
    clearTimeout(timer);
  }
  try {
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((resolve, reject) => {
      if (video.readyState >= 2) return resolve();
      const timer = setTimeout(() => reject(new Error('metadata timeout')), 10_000);
      video.addEventListener('loadedmetadata', () => { clearTimeout(timer); resolve(); }, { once: true });
      video.addEventListener('error', () => { clearTimeout(timer); reject(new Error('video error')); }, { once: true });
    });
    await video.play();
    return stream;
  } catch (e) {
    // 어떤 이유로든 실패하면 카메라를 반드시 끈다(표시등이 켜진 채 남지 않도록)
    for (const t of stream.getTracks()) t.stop();
    video.srcObject = null;
    throw new CameraError('unavailable', e instanceof Error ? e.message : String(e));
  }
}

/** 트랙을 모두 멈추고 연결을 끊는다. 여러 번 호출해도 안전. */
export function closeCamera(video: HTMLVideoElement): void {
  const stream = video.srcObject as MediaStream | null;
  if (stream) for (const t of stream.getTracks()) t.stop();
  video.srcObject = null;
}
