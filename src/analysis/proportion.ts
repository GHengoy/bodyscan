import { LM, type Pose } from '../pose/landmarks';
import { toPlane, dist, mid } from './geometry';

export type ShoulderHipType = 'inverted' | 'balanced' | 'triangle';
export type TorsoLegType = 'longTorso' | 'balanced' | 'longLegs';

export interface ProportionMetrics {
  shoulderHipRatio: number;
  torsoLegRatio: number;
  thighCalfRatio: number;
  shoulderHipType: ShoulderHipType;
  torsoLegType: TorsoLegType;
}

export function classifyShoulderHip(r: number): ShoulderHipType {
  if (r > 1.15) return 'inverted';
  if (r < 0.9) return 'triangle';
  return 'balanced';
}

export function classifyTorsoLeg(r: number): TorsoLegType {
  if (r > 0.62) return 'longTorso';
  if (r < 0.52) return 'longLegs';
  return 'balanced';
}

export function analyzeProportion(pose: Pose, aspect: number): ProportionMetrics {
  const P = (i: number) => toPlane(pose[i], aspect);
  const ls = P(LM.LEFT_SHOULDER), rs = P(LM.RIGHT_SHOULDER);
  const lh = P(LM.LEFT_HIP), rh = P(LM.RIGHT_HIP);
  const lk = P(LM.LEFT_KNEE), rk = P(LM.RIGHT_KNEE);
  const la = P(LM.LEFT_ANKLE), ra = P(LM.RIGHT_ANKLE);

  const shoulderMid = mid(ls, rs), hipMid = mid(lh, rh), ankleMid = mid(la, ra);
  const shoulderHipRatio = dist(ls, rs) / (dist(lh, rh) || 1e-6);
  const torsoLegRatio = dist(shoulderMid, hipMid) / (dist(hipMid, ankleMid) || 1e-6);
  const thighCalfRatio = (dist(lh, lk) + dist(rh, rk)) / (dist(lk, la) + dist(rk, ra) || 1e-6);

  return {
    shoulderHipRatio,
    torsoLegRatio,
    thighCalfRatio,
    shoulderHipType: classifyShoulderHip(shoulderHipRatio),
    torsoLegType: classifyTorsoLeg(torsoLegRatio),
  };
}
