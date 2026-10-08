import { describe, it, expect } from 'vitest';
import { gradeByThreshold, gradePosture, pickHeadline } from '../src/analysis/grade';
import type { FrontMetrics } from '../src/analysis/front';
import type { SideMetrics } from '../src/analysis/side';

const idealFront: FrontMetrics = {
  shoulderTiltDeg: 0, shoulderHigher: 'even', hipTiltDeg: 0, hipHigher: 'even',
  headTiltDeg: 0, headHigher: 'even', centerDeviationPct: 0, kneeDeviationPct: 1,
};
const idealSide: SideMetrics = {
  side: 'right', forwardHeadDeg: 0, roundShoulderPct: 0, pelvicShiftDeg: 0, trunkLeanDeg: 0,
};

describe('gradeByThreshold', () => {
  it('good below warn, warn in between, bad at/above bad', () => {
    expect(gradeByThreshold(1.9, { warn: 2, bad: 4 }).grade).toBe('good');
    expect(gradeByThreshold(2, { warn: 2, bad: 4 }).grade).toBe('warn');
    expect(gradeByThreshold(4, { warn: 2, bad: 4 }).grade).toBe('bad');
  });
  it('severity grows with excess over the boundary', () => {
    expect(gradeByThreshold(1, { warn: 2, bad: 4 }).severity).toBe(0);
    expect(gradeByThreshold(3, { warn: 2, bad: 4 }).severity).toBeCloseTo(0.5);
    expect(gradeByThreshold(8, { warn: 2, bad: 4 }).severity).toBeCloseTo(1);
  });
});

describe('gradePosture', () => {
  it('ideal → 9 items all good', () => {
    const items = gradePosture(idealFront, idealSide);
    expect(items).toHaveLength(9);
    expect(items.every((i) => i.grade === 'good')).toBe(true);
    expect(items.map((i) => i.id)).toEqual([
      'shoulderTilt', 'hipTilt', 'headTilt', 'centerDeviation', 'kneeAlign',
      'forwardHead', 'roundShoulder', 'pelvicTilt', 'trunkLean',
    ]);
  });
  it('variants carry direction', () => {
    const items = gradePosture(
      { ...idealFront, shoulderTiltDeg: 5, shoulderHigher: 'left', kneeDeviationPct: -8 },
      { ...idealSide, pelvicShiftDeg: -12, trunkLeanDeg: 8, forwardHeadDeg: -20 },
    );
    const by = Object.fromEntries(items.map((i) => [i.id, i]));
    expect(by.shoulderTilt.grade).toBe('bad');
    expect(by.shoulderTilt.variant).toBe('left');
    expect(by.kneeAlign.grade).toBe('bad');
    expect(by.kneeAlign.variant).toBe('o');
    expect(by.pelvicTilt.grade).toBe('bad');
    expect(by.pelvicTilt.variant).toBe('anterior');
    expect(by.trunkLean.grade).toBe('bad');
    expect(by.trunkLean.variant).toBe('forward');
    // 머리가 뒤로 간 건 거북목이 아니다 → good
    expect(by.forwardHead.grade).toBe('good');
  });
  it('kneeAlign: |pct| bands, x when positive, o when negative', () => {
    const k = (r: number) => gradePosture({ ...idealFront, kneeDeviationPct: r }, idealSide)[4];
    expect(k(2.9).grade).toBe('good');
    expect(k(2.9).variant).toBe('neutral');
    expect(k(-2.9).variant).toBe('neutral');
    expect(k(4).grade).toBe('warn');
    expect(k(4).variant).toBe('x');
    expect(k(4).severity).toBeCloseTo(1 / 3);
    expect(k(-4).grade).toBe('warn');
    expect(k(-4).variant).toBe('o');
    expect(k(-4).value).toBeCloseTo(4);
    expect(k(9).grade).toBe('bad');
    expect(k(9).severity).toBeCloseTo(0.5);
    expect(k(-6).grade).toBe('bad');
    expect(k(-6).variant).toBe('o');
  });
  it('headTilt variant is the side the head tilts toward (lower ear)', () => {
    const h = (s: 'left' | 'right' | 'even') =>
      gradePosture({ ...idealFront, headTiltDeg: 5, headHigher: s }, idealSide)[2].variant;
    expect(h('left')).toBe('right');
    expect(h('right')).toBe('left');
    expect(h('even')).toBe('even');
  });
  it('pelvicTilt: hip forward (+) → posterior, hip back (−) → anterior', () => {
    const v = (d: number) => gradePosture(idealFront, { ...idealSide, pelvicShiftDeg: d })[7].variant;
    expect(v(12)).toBe('posterior');
    expect(v(-12)).toBe('anterior');
  });
});

describe('pickHeadline', () => {
  it('perfect when all good', () => {
    expect(pickHeadline(gradePosture(idealFront, idealSide))).toEqual({ id: 'perfect', variant: '' });
  });
  it('worst bad item wins by severity', () => {
    const items = gradePosture(
      { ...idealFront, shoulderTiltDeg: 5 }, // bad, severity 0.25
      { ...idealSide, forwardHeadDeg: 30 }, // bad, severity 1.0
    );
    expect(pickHeadline(items).id).toBe('forwardHead');
  });
  it('warn-only picks worst warn', () => {
    const items = gradePosture(
      { ...idealFront, hipTiltDeg: 3.9, hipHigher: 'right' },
      { ...idealSide, roundShoulderPct: 6 },
    );
    const h = pickHeadline(items);
    expect(h.id).toBe('hipTilt');
    expect(h.variant).toBe('right');
  });
});
