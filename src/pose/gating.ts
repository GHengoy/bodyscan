import { LM, type Point, type Pose } from './landmarks';
import { toPlane, dist, mid } from '../analysis/geometry';

export const VIS_MIN = 0.6;
const FRAME_MARGIN = 0.02;
const FRONT_MIN_RATIO = 0.45;
const SIDE_MAX_RATIO = 0.2;

const FULL_BODY_IDS = [
  LM.NOSE, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
  LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
];
const LEFT_SIDE_IDS = [LM.LEFT_EAR, LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE];
const RIGHT_SIDE_IDS = [LM.RIGHT_EAR, LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE];

export function inFrame(p: Point): boolean {
  return p.x >= FRAME_MARGIN && p.x <= 1 - FRAME_MARGIN && p.y >= FRAME_MARGIN && p.y <= 1 - FRAME_MARGIN;
}

function allVisible(pose: Pose, ids: number[]): boolean {
  return ids.every((i) => pose[i].visibility >= VIS_MIN && inFrame(pose[i]));
}

/** 머리·어깨·골반·발목이 모두 잘 보이고 프레임 안에 있는가 */
export function fullBodyVisible(pose: Pose): boolean {
  return allVisible(pose, FULL_BODY_IDS);
}

/** 어깨 너비 / 몸통 길이. 정면이면 크고(≈0.8~1.2), 측면이면 0에 가깝다. */
export function shoulderTorsoRatio(pose: Pose, aspect: number): number {
  const ls = toPlane(pose[LM.LEFT_SHOULDER], aspect);
  const rs = toPlane(pose[LM.RIGHT_SHOULDER], aspect);
  const lh = toPlane(pose[LM.LEFT_HIP], aspect);
  const rh = toPlane(pose[LM.RIGHT_HIP], aspect);
  const torso = dist(mid(ls, rs), mid(lh, rh));
  if (torso === 0) return 0;
  return dist(ls, rs) / torso;
}

export function isFacingFront(pose: Pose, aspect: number): boolean {
  return fullBodyVisible(pose) && shoulderTorsoRatio(pose, aspect) >= FRONT_MIN_RATIO;
}

/** 가시성 합이 더 큰 쪽 = 카메라를 향한 쪽 */
export function pickVisibleSide(pose: Pose): 'left' | 'right' {
  const sum = (ids: number[]) => ids.reduce((s, i) => s + pose[i].visibility, 0);
  return sum(LEFT_SIDE_IDS) >= sum(RIGHT_SIDE_IDS) ? 'left' : 'right';
}

export function isFacingSide(pose: Pose, aspect: number): boolean {
  const ids = pickVisibleSide(pose) === 'left' ? LEFT_SIDE_IDS : RIGHT_SIDE_IDS;
  return allVisible(pose, ids) && shoulderTorsoRatio(pose, aspect) <= SIDE_MAX_RATIO;
}

/** 조건이 holdMs 동안 연속 유지되었는지 추적 */
export class HoldTimer {
  private since: number | null = null;
  constructor(private readonly holdMs: number) {}

  update(ok: boolean, now: number): boolean {
    if (!ok) {
      this.since = null;
      return false;
    }
    if (this.since === null) this.since = now;
    return now - this.since >= this.holdMs;
  }

  progress(now: number): number {
    if (this.since === null) return 0;
    return Math.min(1, (now - this.since) / this.holdMs);
  }

  reset(): void {
    this.since = null;
  }
}
