import { describe, it, expect } from 'vitest';
import { LM } from '../src/pose/landmarks';
import { analyzeSide } from '../src/analysis/side';
import { standingSide } from './helpers';

describe('analyzeSide', () => {
  it('ideal side pose is neutral and picks visible side', () => {
    const m = analyzeSide(standingSide('right'), 1);
    expect(m.side).toBe('right');
    expect(m.forwardHeadDeg).toBeCloseTo(0);
    expect(m.roundShoulderPct).toBeCloseTo(0);
    expect(m.pelvicShiftDeg).toBeCloseTo(0);
    expect(m.trunkLeanDeg).toBeCloseTo(0);
  });

  it('ear ahead of shoulder → positive forward head (facing right)', () => {
    const p = standingSide('right');
    p[LM.RIGHT_EAR].x = 0.55; // 0.05 ahead over 0.15 → 18.4°
    p[LM.NOSE].x = 0.59; // 머리 전체가 앞으로(코는 귀보다 앞)
    expect(analyzeSide(p, 1).forwardHeadDeg).toBeCloseTo(18.43, 1);
  });

  it('ear ahead of shoulder → positive forward head (facing left, mirrored)', () => {
    const p = standingSide('left');
    p[LM.LEFT_EAR].x = 0.45; // 왼쪽을 보고 있으니 앞 = -x
    p[LM.NOSE].x = 0.41;
    expect(analyzeSide(p, 1).forwardHeadDeg).toBeCloseTo(18.43, 1);
  });

  it('shoulder forward of ear–hip line → positive round shoulder %', () => {
    const p = standingSide('right');
    p[LM.RIGHT_SHOULDER].x = 0.53; // 0.03 ahead, torso ≈ 0.222 → ≈13.5%
    const m = analyzeSide(p, 1);
    expect(m.roundShoulderPct).toBeGreaterThan(12);
    expect(m.roundShoulderPct).toBeLessThan(15);
  });

  it('hip pushed forward → positive pelvic shift', () => {
    const p = standingSide('right');
    p[LM.RIGHT_HIP].x = 0.53;
    expect(analyzeSide(p, 1).pelvicShiftDeg).toBeGreaterThan(5);
  });

  it('hip pushed backward → negative pelvic shift', () => {
    const p = standingSide('right');
    p[LM.RIGHT_HIP].x = 0.47;
    expect(analyzeSide(p, 1).pelvicShiftDeg).toBeLessThan(-5);
  });

  it('shoulder ahead of hip → positive trunk lean', () => {
    const p = standingSide('right');
    p[LM.RIGHT_SHOULDER].x = 0.54;
    p[LM.RIGHT_EAR].x = 0.54; // 머리도 같이 → 거북목 0 유지
    p[LM.NOSE].x = 0.58;
    const m = analyzeSide(p, 1);
    expect(m.trunkLeanDeg).toBeCloseTo(10.3, 0); // atan(0.04/0.22)
    expect(m.forwardHeadDeg).toBeCloseTo(0);
  });

  it('facing left: shoulder forward of ear–hip line → positive round shoulder %', () => {
    const p = standingSide('left');
    p[LM.LEFT_SHOULDER].x = 0.47;
    const m = analyzeSide(p, 1);
    expect(m.side).toBe('left');
    expect(m.roundShoulderPct).toBeGreaterThan(12);
    expect(m.roundShoulderPct).toBeLessThan(15);
  });

  it('facing left: hip pushed forward → positive, backward → negative pelvic shift', () => {
    const fwd = standingSide('left');
    fwd[LM.LEFT_HIP].x = 0.47;
    expect(analyzeSide(fwd, 1).pelvicShiftDeg).toBeGreaterThan(5);
    const back = standingSide('left');
    back[LM.LEFT_HIP].x = 0.53;
    expect(analyzeSide(back, 1).pelvicShiftDeg).toBeLessThan(-5);
  });

  it('facing left: shoulder ahead of hip → positive trunk lean', () => {
    const p = standingSide('left');
    p[LM.LEFT_SHOULDER].x = 0.46;
    p[LM.LEFT_EAR].x = 0.46;
    p[LM.NOSE].x = 0.42;
    const m = analyzeSide(p, 1);
    expect(m.trunkLeanDeg).toBeCloseTo(10.3, 0);
    expect(m.forwardHeadDeg).toBeCloseTo(0);
  });

  it('facing is taken from the head: strong forward trunk lean does not flip direction', () => {
    const p = standingSide('right');
    // 상체가 크게 앞으로 숙여 어깨가 코보다 앞(+x)에 있어도 앞 방향은 +x
    p[LM.RIGHT_EAR].x = 0.6;
    p[LM.NOSE].x = 0.64;
    p[LM.RIGHT_SHOULDER].x = 0.66;
    expect(analyzeSide(p, 1).trunkLeanDeg).toBeGreaterThan(30);
  });
});
