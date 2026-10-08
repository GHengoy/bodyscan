import { describe, it, expect } from 'vitest';
import { LM } from '../src/pose/landmarks';
import { analyzeFront } from '../src/analysis/front';
import { standingFront } from './helpers';

describe('analyzeFront', () => {
  it('ideal pose is all zeros / neutral', () => {
    const m = analyzeFront(standingFront(), 1);
    expect(m.shoulderTiltDeg).toBeCloseTo(0);
    expect(m.shoulderHigher).toBe('even');
    expect(m.hipTiltDeg).toBeCloseTo(0);
    expect(m.headTiltDeg).toBeCloseTo(0);
    expect(m.centerDeviationPct).toBeCloseTo(0);
    // 왼다리: 고관절 (0.61,0.52) → 발목 (0.57,0.9), 무릎 (0.58,0.71)
    // 수직 거리 = |0.38·(−0.03) + 0.04·0.19| / √(0.04²+0.38²) = 0.0038/0.38210 = 0.009945 (안쪽)
    // ÷ 다리 길이 0.38210 × 100 ≈ 2.603%
    expect(m.kneeDeviationPct).toBeCloseTo(2.603, 2);
  });

  it('left shoulder raised → tilt and higher=left', () => {
    const p = standingFront();
    p[LM.LEFT_SHOULDER].y = 0.28; // 0.02 up over 0.24 width → atan(0.02/0.24)=4.76°
    const m = analyzeFront(p, 1);
    expect(m.shoulderTiltDeg).toBeCloseTo(4.76, 1);
    expect(m.shoulderHigher).toBe('left');
  });

  it('right hip raised → hipHigher=right', () => {
    const p = standingFront();
    p[LM.RIGHT_HIP].y = 0.5;
    const m = analyzeFront(p, 1);
    expect(m.hipHigher).toBe('right');
    expect(m.hipTiltDeg).toBeGreaterThan(4);
  });

  it('head tilt from ears', () => {
    const p = standingFront();
    p[LM.LEFT_EAR].y = 0.14;
    p[LM.RIGHT_EAR].y = 0.16;
    const m = analyzeFront(p, 1);
    expect(m.headTiltDeg).toBeCloseTo(14.04, 1); // atan(0.02/0.08)
    expect(m.headHigher).toBe('left');
  });

  it('center deviation: nose shifted by 10% of shoulder width', () => {
    const p = standingFront();
    p[LM.NOSE].x = 0.5 + 0.024;
    const m = analyzeFront(p, 1);
    expect(m.centerDeviationPct).toBeCloseTo(10, 1);
  });

  it('knees moved inward 0.04 → large positive deviation (X)', () => {
    const p = standingFront();
    p[LM.LEFT_KNEE].x = 0.54;
    p[LM.RIGHT_KNEE].x = 0.46;
    // (0.38·0.07 − 0.04·0.19)/0.38210 = 0.04973 → /0.38210 ×100 ≈ 13.01%
    expect(analyzeFront(p, 1).kneeDeviationPct).toBeCloseTo(13.01, 1);
  });

  it('knees moved outward 0.04 → negative deviation (O)', () => {
    const p = standingFront();
    p[LM.LEFT_KNEE].x = 0.62;
    p[LM.RIGHT_KNEE].x = 0.38;
    // −(0.38·0.01 + 0.04·0.19)/0.38210 = −0.02984 → ≈ −7.81%
    expect(analyzeFront(p, 1).kneeDeviationPct).toBeCloseTo(-7.81, 1);
  });

  it('knee deviation is independent of stance width when legs are straight', () => {
    const p = standingFront();
    // 다리를 넓게 벌려도 무릎이 고관절–발목 직선 위에 있으면 0
    p[LM.LEFT_ANKLE].x = 0.75; p[LM.RIGHT_ANKLE].x = 0.25;
    p[LM.LEFT_KNEE].x = 0.68; p[LM.RIGHT_KNEE].x = 0.32;
    expect(analyzeFront(p, 1).kneeDeviationPct).toBeCloseTo(0, 5);
  });

  it('aspect correction changes tilt angles', () => {
    const p = standingFront();
    p[LM.LEFT_SHOULDER].y = 0.28;
    const wide = analyzeFront(p, 1).shoulderTiltDeg;
    const narrow = analyzeFront(p, 0.5625).shoulderTiltDeg;
    expect(narrow).toBeGreaterThan(wide);
  });
});
