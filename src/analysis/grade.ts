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

export const THRESHOLDS: Record<Exclude<PostureItemId, 'kneeAlign'>, Threshold> = {
  shoulderTilt: { warn: 2, bad: 4 },
  hipTilt: { warn: 2, bad: 4 },
  headTilt: { warn: 2, bad: 4 },
  centerDeviation: { warn: 5, bad: 10 },
  forwardHead: { warn: 5, bad: 15 },
  roundShoulder: { warn: 5, bad: 12 },
  pelvicTilt: { warn: 5, bad: 10 },
  trunkLean: { warn: 3, bad: 7 },
};

/** 무릎간격/발목간격: 0.8~1.3 중립, ±0.1~0.15 주의 밴드, 그 밖 불균형 */
const KNEE = { xBad: 0.7, xWarn: 0.8, oWarn: 1.3, oBad: 1.45 };

export function gradeByThreshold(abs: number, t: Threshold): { grade: Grade; severity: number } {
  if (abs >= t.bad) return { grade: 'bad', severity: (abs - t.bad) / t.bad };
  if (abs >= t.warn) return { grade: 'warn', severity: (abs - t.warn) / t.warn };
  return { grade: 'good', severity: 0 };
}

function gradeKnee(r: number): { grade: Grade; severity: number; variant: string } {
  if (r < KNEE.xWarn) {
    const variant = 'x';
    if (r < KNEE.xBad) return { grade: 'bad', severity: (KNEE.xBad - r) / KNEE.xBad, variant };
    return { grade: 'warn', severity: (KNEE.xWarn - r) / KNEE.xWarn, variant };
  }
  if (r > KNEE.oWarn) {
    const variant = 'o';
    if (r > KNEE.oBad) return { grade: 'bad', severity: (r - KNEE.oBad) / KNEE.oBad, variant };
    return { grade: 'warn', severity: (r - KNEE.oWarn) / KNEE.oWarn, variant };
  }
  return { grade: 'good', severity: 0, variant: 'neutral' };
}

function item(id: Exclude<PostureItemId, 'kneeAlign'>, value: number, variant: string): GradedItem {
  // 뒤로 간 머리/뒤로 기운 상체는 "양호"로 취급(음수는 측정 항목의 문제가 아님)
  const abs = id === 'forwardHead' || id === 'roundShoulder' ? Math.max(0, value) : Math.abs(value);
  const { grade, severity } = gradeByThreshold(abs, THRESHOLDS[id]);
  return { id, grade, value: abs, severity, variant };
}

const sideVariant = (s: Side): string => s;

export function gradePosture(front: FrontMetrics, side: SideMetrics): GradedItem[] {
  const knee = gradeKnee(front.kneeAnkleRatio);
  return [
    item('shoulderTilt', front.shoulderTiltDeg, sideVariant(front.shoulderHigher)),
    item('hipTilt', front.hipTiltDeg, sideVariant(front.hipHigher)),
    item('headTilt', front.headTiltDeg, sideVariant(front.headHigher)),
    item('centerDeviation', front.centerDeviationPct, ''),
    { id: 'kneeAlign', grade: knee.grade, value: front.kneeAnkleRatio, severity: knee.severity, variant: knee.variant },
    item('forwardHead', side.forwardHeadDeg, ''),
    item('roundShoulder', side.roundShoulderPct, ''),
    item('pelvicTilt', side.pelvicShiftDeg, side.pelvicShiftDeg >= 0 ? 'anterior' : 'posterior'),
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
