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
    expect(m.kneeAnkleRatio).toBeCloseTo(0.16 / 0.14, 2);
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

  it('knees close together → low knee/ankle ratio', () => {
    const p = standingFront();
    p[LM.LEFT_KNEE].x = 0.52;
    p[LM.RIGHT_KNEE].x = 0.48;
    expect(analyzeFront(p, 1).kneeAnkleRatio).toBeCloseTo(0.04 / 0.14, 2);
  });

  it('aspect correction changes tilt angles', () => {
    const p = standingFront();
    p[LM.LEFT_SHOULDER].y = 0.28;
    const wide = analyzeFront(p, 1).shoulderTiltDeg;
    const narrow = analyzeFront(p, 0.5625).shoulderTiltDeg;
    expect(narrow).toBeGreaterThan(wide);
  });
});
