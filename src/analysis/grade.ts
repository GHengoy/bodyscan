import type { FrontMetrics, Side } from './front';
import type { SideMetrics } from './side';

export type Grade = 'good' | 'warn' | 'bad';

export type PostureItemId =
  | 'shoulderTilt' | 'hipTilt' | 'headTilt' | 'centerDeviation' | 'kneeAlign'
  | 'forwardHead' | 'roundShoulder' | 'pelvicTilt' | 'trunkLean';

export interface GradedItem {
  id: PostureItemId;
  grade: Grade;
  /** 표시용 원 수치(각도·%·비율) */
  value: number;
  /** 경계값 대비 초과 비율. 종합 캐릭터 선택에 사용 */
  severity: number;
  /** 방향: left|right|even|o|x|neutral|anterior|posterior|forward|backward */
  variant: string;
}

export interface Threshold {
  warn: number;
  bad: number;
}

export const THRESHOLDS: Record<PostureItemId, Threshold> = {
  shoulderTilt: { warn: 2, bad: 4 },
  hipTilt: { warn: 2, bad: 4 },
  headTilt: { warn: 2, bad: 4 },
  centerDeviation: { warn: 5, bad: 10 },
  /** 무릎 편차 % (|값| 기준, 부호로 X/O 구분) */
  kneeAlign: { warn: 3, bad: 6 },
  forwardHead: { warn: 5, bad: 15 },
  roundShoulder: { warn: 5, bad: 12 },
  pelvicTilt: { warn: 5, bad: 10 },
  trunkLean: { warn: 3, bad: 7 },
};

export function gradeByThreshold(abs: number, t: Threshold): { grade: Grade; severity: number } {
  if (abs >= t.bad) return { grade: 'bad', severity: (abs - t.bad) / t.bad };
  if (abs >= t.warn) return { grade: 'warn', severity: (abs - t.warn) / t.warn };
  return { grade: 'good', severity: 0 };
}

/** 무릎 편차: 양수 = X자(안쪽), 음수 = O자(바깥쪽). 양호 범위면 neutral */
function gradeKnee(pct: number): GradedItem {
  const abs = Math.abs(pct);
  const { grade, severity } = gradeByThreshold(abs, THRESHOLDS.kneeAlign);
  const variant = grade === 'good' ? 'neutral' : pct > 0 ? 'x' : 'o';
  return { id: 'kneeAlign', grade, value: abs, severity, variant };
}

function item(id: Exclude<PostureItemId, 'kneeAlign'>, value: number, variant: string): GradedItem {
  // 머리/어깨가 뒤로 간 경우는 거북목·라운드숄더가 아니므로 0으로 클램프. 그 외 항목은 절댓값.
  const abs = id === 'forwardHead' || id === 'roundShoulder' ? Math.max(0, value) : Math.abs(value);
  const { grade, severity } = gradeByThreshold(abs, THRESHOLDS[id]);
  return { id, grade, value: abs, severity, variant };
}

const sideVariant = (s: Side): string => s;
/** 머리는 높은 귀의 반대쪽(낮은 귀 쪽)으로 기운다 */
const tiltToward = (higher: Side): string => (higher === 'left' ? 'right' : higher === 'right' ? 'left' : 'even');

export function gradePosture(front: FrontMetrics, side: SideMetrics): GradedItem[] {
  return [
    item('shoulderTilt', front.shoulderTiltDeg, sideVariant(front.shoulderHigher)),
    item('hipTilt', front.hipTiltDeg, sideVariant(front.hipHigher)),
    item('headTilt', front.headTiltDeg, tiltToward(front.headHigher)),
    item('centerDeviation', front.centerDeviationPct, ''),
    gradeKnee(front.kneeDeviationPct),
    item('forwardHead', side.forwardHeadDeg, ''),
    item('roundShoulder', side.roundShoulderPct, ''),
    // 고관절이 어깨–무릎 선보다 앞(+) = 스웨이백 패턴 = 후방경사 경향
    item('pelvicTilt', side.pelvicShiftDeg, side.pelvicShiftDeg >= 0 ? 'posterior' : 'anterior'),
    item('trunkLean', side.trunkLeanDeg, side.trunkLeanDeg >= 0 ? 'forward' : 'backward'),
  ];
}

export interface Headline {
  id: PostureItemId | 'perfect';
  variant: string;
}

/** bad 중 severity 최대 → 없으면 warn 중 최대 → 없으면 perfect */
export function pickHeadline(items: GradedItem[]): Headline {
  for (const g of ['bad', 'warn'] as const) {
    const pool = items.filter((i) => i.grade === g);
    if (pool.length === 0) continue;
    const worst = pool.reduce((a, b) => (b.severity > a.severity ? b : a));
    return { id: worst.id, variant: worst.variant };
  }
  return { id: 'perfect', variant: '' };
}
