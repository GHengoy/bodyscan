import { describe, it, expect } from 'vitest';
import { medianPose, PoseSampler } from '../src/pose/sampler';
import { makePose } from './helpers';

describe('medianPose', () => {
  it('takes per-coordinate median and mean visibility', () => {
    const frames = [
      makePose({ 0: { x: 0.1, y: 0.9, visibility: 0.5 } }),
      makePose({ 0: { x: 0.2, y: 0.8, visibility: 1.0 } }),
      makePose({ 0: { x: 0.9, y: 0.1, visibility: 0.5 } }), // 이상치
    ];
    const m = medianPose(frames);
    expect(m[0].x).toBeCloseTo(0.2);
    expect(m[0].y).toBeCloseTo(0.8);
    expect(m[0].visibility).toBeCloseTo(2 / 3);
    expect(m).toHaveLength(33);
  });
  it('even count averages the two middle values', () => {
    const m = medianPose([makePose({ 0: { x: 0 } }), makePose({ 0: { x: 1 } })]);
    expect(m[0].x).toBeCloseTo(0.5);
  });
  it('throws on empty input', () => {
    expect(() => medianPose([])).toThrow();
  });
});

describe('PoseSampler', () => {
  it('collects for duration then completes', () => {
    const s = new PoseSampler(3000);
    expect(s.isComplete(0)).toBe(false);
    s.add(makePose({ 0: { x: 0.1 } }), 0);
    s.add(makePose({ 0: { x: 0.3 } }), 1500);
    expect(s.progress(1500)).toBeCloseTo(0.5);
    expect(s.isComplete(2999)).toBe(false);
    s.add(makePose({ 0: { x: 0.2 } }), 3000);
    expect(s.isComplete(3000)).toBe(true);
    expect(s.result()[0].x).toBeCloseTo(0.2);
  });
  it('reset clears frames', () => {
    const s = new PoseSampler(1000);
    s.add(makePose(), 0);
    s.reset();
    expect(s.progress(500)).toBe(0);
    expect(() => s.result()).toThrow();
  });
});
