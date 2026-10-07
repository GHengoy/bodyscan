import { LM, type Pose } from '../pose/landmarks';
import { toPlane, dist, mid, lineTiltDeg, type Vec2 } from './geometry';

export type Side = 'left' | 'right' | 'even';

export interface FrontMetrics {
  /** 어깨선 기울기(절댓값, 도) */
  shoulderTiltDeg: number;
  shoulderHigher: Side;
  hipTiltDeg: number;
  hipHigher: Side;
  headTiltDeg: number;
  headHigher: Side;
  /** 코·어깨중점·골반중점·발목중점 x 최대 편차 / 어깨 너비 × 100 */
  centerDeviationPct: number;
  /** 무릎 간격 / 발목 간격 */
  kneeAnkleRatio: number;
}

const EVEN_DEG = 0.5;

/** 사람 기준 왼쪽 점(l)과 오른쪽 점(r) 중 어느 쪽이 더 높은가(y 작음) */
function higher(l: Vec2, r: Vec2, tiltDeg: number): Side {
  if (tiltDeg < EVEN_DEG) return 'even';
  return l.y < r.y ? 'left' : 'right';
}

export function analyzeFront(pose: Pose, aspect: number): FrontMetrics {
  const P = (i: number) => toPlane(pose[i], aspect);
  const ls = P(LM.LEFT_SHOULDER), rs = P(LM.RIGHT_SHOULDER);
  const lh = P(LM.LEFT_HIP), rh = P(LM.RIGHT_HIP);
  const le = P(LM.LEFT_EAR), re = P(LM.RIGHT_EAR);
  const lk = P(LM.LEFT_KNEE), rk = P(LM.RIGHT_KNEE);
  const la = P(LM.LEFT_ANKLE), ra = P(LM.RIGHT_ANKLE);
  const nose = P(LM.NOSE);

  const shoulderTiltDeg = Math.abs(lineTiltDeg(ls, rs));
  const hipTiltDeg = Math.abs(lineTiltDeg(lh, rh));
  const headTiltDeg = Math.abs(lineTiltDeg(le, re));

  const shoulderWidth = dist(ls, rs) || 1e-6;
  const xs = [nose.x, mid(ls, rs).x, mid(lh, rh).x, mid(la, ra).x];
  const centerDeviationPct = ((Math.max(...xs) - Math.min(...xs)) / shoulderWidth) * 100;

  const ankleGap = dist(la, ra) || 1e-6;
  const kneeAnkleRatio = dist(lk, rk) / ankleGap;

  return {
    shoulderTiltDeg,
    shoulderHigher: higher(ls, rs, shoulderTiltDeg),
    hipTiltDeg,
    hipHigher: higher(lh, rh, hipTiltDeg),
    headTiltDeg,
    headHigher: higher(le, re, headTiltDeg),
    centerDeviationPct,
    kneeAnkleRatio,
  };
}
