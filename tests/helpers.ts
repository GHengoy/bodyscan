import { LM, POSE_COUNT, type Point, type Pose } from '../src/pose/landmarks';

/** 모든 점을 base로 채우고 overrides로 덮어쓴 33점 포즈 */
export function makePose(
  overrides: Record<number, Partial<Point>> = {},
  base: Partial<Point> = {},
): Pose {
  const def: Point = { x: 0.5, y: 0.5, z: 0, visibility: 0.9, ...base };
  const pose: Pose = Array.from({ length: POSE_COUNT }, () => ({ ...def }));
  for (const [i, p] of Object.entries(overrides)) pose[Number(i)] = { ...def, ...p };
  return pose;
}

/**
 * 카메라를 정면으로 바라보고 똑바로 선 이상적인 포즈 (aspect=1 기준).
 * 사람의 LEFT는 미러링 안 된 이미지에서 x가 큰 쪽.
 * 어깨너비 0.24, 골반너비 0.22 (비율 1.09=균형), 몸통 0.22, 다리 0.38 (비율 0.58=균형),
 * 무릎 ±0.08 / 고관절 ±0.11 / 발목 ±0.07 → 무릎 편차 ≈ +2.6% (양호)
 */
export function standingFront(): Pose {
  const cx = 0.5;
  const sym = (idxL: number, idxR: number, dx: number, y: number, o: Record<number, Partial<Point>>) => {
    o[idxL] = { x: cx + dx, y };
    o[idxR] = { x: cx - dx, y };
  };
  const o: Record<number, Partial<Point>> = { [LM.NOSE]: { x: cx, y: 0.15 } };
  sym(LM.LEFT_EYE, LM.RIGHT_EYE, 0.02, 0.14, o);
  sym(LM.LEFT_EAR, LM.RIGHT_EAR, 0.04, 0.15, o);
  sym(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, 0.12, 0.3, o);
  sym(LM.LEFT_ELBOW, LM.RIGHT_ELBOW, 0.14, 0.42, o);
  sym(LM.LEFT_WRIST, LM.RIGHT_WRIST, 0.15, 0.53, o);
  sym(LM.LEFT_HIP, LM.RIGHT_HIP, 0.11, 0.52, o);
  sym(LM.LEFT_KNEE, LM.RIGHT_KNEE, 0.08, 0.71, o);
  sym(LM.LEFT_ANKLE, LM.RIGHT_ANKLE, 0.07, 0.9, o);
  sym(LM.LEFT_HEEL, LM.RIGHT_HEEL, 0.07, 0.93, o);
  sym(LM.LEFT_FOOT_INDEX, LM.RIGHT_FOOT_INDEX, 0.08, 0.95, o);
  return makePose(o);
}

/**
 * 옆으로 선 포즈. facing='right'면 사람이 이미지의 +x 방향을 보고 있고
 * 카메라에 보이는 쪽은 사람의 RIGHT. 보이는 쪽 visibility 0.9, 반대쪽 0.3.
 */
export function standingSide(facing: 'left' | 'right' = 'right'): Pose {
  const cx = 0.5;
  const f = facing === 'right' ? 1 : -1;
  const visibleIsRight = facing === 'right';
  const vis = (isRight: boolean) => (isRight === visibleIsRight ? 0.9 : 0.3);
  const pair = (idxL: number, idxR: number, x: number, y: number, o: Record<number, Partial<Point>>) => {
    o[idxL] = { x, y, visibility: vis(false) };
    o[idxR] = { x, y, visibility: vis(true) };
  };
  const o: Record<number, Partial<Point>> = { [LM.NOSE]: { x: cx + 0.04 * f, y: 0.16 } };
  pair(LM.LEFT_EYE, LM.RIGHT_EYE, cx + 0.02 * f, 0.14, o);
  pair(LM.LEFT_EAR, LM.RIGHT_EAR, cx, 0.15, o);
  pair(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, cx, 0.3, o);
  pair(LM.LEFT_ELBOW, LM.RIGHT_ELBOW, cx, 0.42, o);
  pair(LM.LEFT_WRIST, LM.RIGHT_WRIST, cx + 0.02 * f, 0.53, o);
  pair(LM.LEFT_HIP, LM.RIGHT_HIP, cx, 0.52, o);
  pair(LM.LEFT_KNEE, LM.RIGHT_KNEE, cx, 0.71, o);
  pair(LM.LEFT_ANKLE, LM.RIGHT_ANKLE, cx, 0.9, o);
  pair(LM.LEFT_HEEL, LM.RIGHT_HEEL, cx - 0.03 * f, 0.93, o);
  pair(LM.LEFT_FOOT_INDEX, LM.RIGHT_FOOT_INDEX, cx + 0.06 * f, 0.95, o);
  return makePose(o);
}
