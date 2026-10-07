import { LM, type Pose } from '../pose/landmarks';
import { pickVisibleSide } from '../pose/gating';
import { toPlane, dist, angleFromVerticalDeg, angleAtDeg, xOnLineAtY } from './geometry';

export interface SideMetrics {
  side: 'left' | 'right';
  /** 어깨→귀가 얼굴 방향으로 기운 각도(도). 양수 = 머리가 앞으로 */
  forwardHeadDeg: number;
  /** 어깨가 귀–고관절 선보다 앞으로 나간 정도(몸통 길이 대비 %) */
  roundShoulderPct: number;
  /** 180 − ∠(어깨–고관절–무릎). 고관절이 앞이면 +(전방경사 경향), 뒤면 − */
  pelvicShiftDeg: number;
  /** 고관절→어깨가 수직에서 앞으로 기운 각도. 양수 = 앞으로 */
  trunkLeanDeg: number;
}

export function analyzeSide(pose: Pose, aspect: number): SideMetrics {
  const side = pickVisibleSide(pose);
  const idx =
    side === 'left'
      ? { ear: LM.LEFT_EAR, shoulder: LM.LEFT_SHOULDER, hip: LM.LEFT_HIP, knee: LM.LEFT_KNEE }
      : { ear: LM.RIGHT_EAR, shoulder: LM.RIGHT_SHOULDER, hip: LM.RIGHT_HIP, knee: LM.RIGHT_KNEE };

  const P = (i: number) => toPlane(pose[i], aspect);
  const ear = P(idx.ear), shoulder = P(idx.shoulder), hip = P(idx.hip), knee = P(idx.knee);
  const nose = P(LM.NOSE);

  // 이미지 좌표에서 사람이 바라보는 방향(+1 = +x). 코가 어깨보다 앞에 있다.
  const fwd = Math.sign(nose.x - shoulder.x) || 1;
  const torso = dist(shoulder, hip) || 1e-6;

  const forwardHeadDeg = angleFromVerticalDeg(shoulder, ear) * fwd;

  const lineXAtShoulder = xOnLineAtY(ear, hip, shoulder.y);
  const roundShoulderPct = (((shoulder.x - lineXAtShoulder) * fwd) / torso) * 100;

  const lineXAtHip = xOnLineAtY(shoulder, knee, hip.y);
  const hipForward = Math.sign((hip.x - lineXAtHip) * fwd) || 1;
  const pelvicShiftDeg = (180 - angleAtDeg(shoulder, hip, knee)) * hipForward;

  const trunkLeanDeg = angleFromVerticalDeg(hip, shoulder) * fwd;

  return { side, forwardHeadDeg, roundShoulderPct, pelvicShiftDeg, trunkLeanDeg };
}
