import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Pose } from './landmarks';

export interface PoseDetector {
  /** 같은 nowMs로 두 번 호출하지 않는다(MediaPipe는 단조 증가 타임스탬프 요구). close 이후에는 null */
  detect(video: HTMLVideoElement, nowMs: number): Pose | null;
  /** 여러 번 호출해도 안전 */
  close(): void;
}

const MODEL_PATH = '/models/pose_landmarker_lite.task';
const WASM_PATH = '/wasm';

async function build(delegate: 'GPU' | 'CPU'): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_PATH, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

/** 모델·WASM은 같은 출처에서 로드된다. 측정 시작 전에 완료되어야 한다. */
export async function createDetector(): Promise<PoseDetector> {
  let lm: PoseLandmarker;
  try {
    lm = await build('GPU');
  } catch (gpuErr) {
    console.warn('[detector] GPU delegate failed, falling back to CPU', gpuErr);
    lm = await build('CPU');
  }
  let lastTs = -1;
  let closed = false;
  return {
    detect(video, nowMs) {
      if (closed || video.readyState < 2 || video.videoWidth === 0) return null;
      const ts = Math.max(nowMs, lastTs + 1);
      lastTs = ts;
      const res = lm.detectForVideo(video, ts);
      const first = res.landmarks[0];
      if (!first || first.length !== 33) return null;
      return first.map((p) => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility ?? 0 }));
    },
    close() {
      if (closed) return;
      closed = true;
      lm.close();
    },
  };
}
