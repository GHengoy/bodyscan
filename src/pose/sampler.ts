import { POSE_COUNT, type Pose } from './landmarks';

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

/** 여러 프레임의 좌표별 중앙값(흔들림·이상치 제거). visibility는 평균. */
export function medianPose(frames: Pose[]): Pose {
  if (frames.length === 0) throw new Error('medianPose: no frames');
  const out: Pose = [];
  for (let i = 0; i < POSE_COUNT; i++) {
    const pts = frames.map((f) => f[i]);
    out.push({
      x: median(pts.map((p) => p.x)),
      y: median(pts.map((p) => p.y)),
      z: median(pts.map((p) => p.z)),
      visibility: pts.reduce((s, p) => s + p.visibility, 0) / pts.length,
    });
  }
  return out;
}

/** durationMs 동안 포즈를 모아 중앙값 포즈를 만든다 */
export class PoseSampler {
  private frames: Pose[] = [];
  private startedAt: number | null = null;

  constructor(private readonly durationMs: number) {}

  add(pose: Pose, now: number): void {
    if (this.startedAt === null) this.startedAt = now;
    this.frames.push(pose);
  }

  progress(now: number): number {
    if (this.startedAt === null) return 0;
    return Math.min(1, (now - this.startedAt) / this.durationMs);
  }

  isComplete(now: number): boolean {
    return this.startedAt !== null && now - this.startedAt >= this.durationMs && this.frames.length > 0;
  }

  reset(): void {
    this.frames = [];
    this.startedAt = null;
  }

  result(): Pose {
    return medianPose(this.frames);
  }
}
