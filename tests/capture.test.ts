import { describe, it, expect } from 'vitest';
import { CaptureStage } from '../src/pose/capture';
import { makePose } from './helpers';

const ok = () => true;
const opts = { holdMs: 1000, countdownMs: 3000, sampleMs: 2000 };

describe('CaptureStage', () => {
  it('null pose keeps align with ok=false', () => {
    const st = new CaptureStage(ok, opts);
    const s = st.update(null, 0);
    expect(s.step).toBe('align');
    expect(s.ok).toBe(false);
  });

  it('align → countdown → sampling → done over time', () => {
    const st = new CaptureStage(ok, opts);
    const p = makePose({ 0: { x: 0.4 } });
    expect(st.update(p, 0).step).toBe('align');
    expect(st.update(p, 500).holdProgress).toBeCloseTo(0.5);
    let s = st.update(p, 1000);
    expect(s.step).toBe('countdown');
    expect(s.countdown).toBe(3);
    expect(st.update(p, 2100).countdown).toBe(2);
    expect(st.update(p, 3100).countdown).toBe(1);
    s = st.update(p, 4000);
    expect(s.step).toBe('sampling');
    expect(st.update(p, 5000).sampleProgress).toBeCloseTo(0.5);
    s = st.update(p, 6000);
    expect(s.done).toBeDefined();
    expect(s.done![0].x).toBeCloseTo(0.4);
  });

  it('losing ok during countdown resets to align', () => {
    const st = new CaptureStage((p) => p[0].x > 0, opts);
    const good = makePose({ 0: { x: 0.5 } });
    const bad = makePose({ 0: { x: 0 } });
    st.update(good, 0);
    st.update(good, 1000);
    expect(st.update(good, 1500).step).toBe('countdown');
    expect(st.update(bad, 1600).step).toBe('align');
    expect(st.update(good, 1700).step).toBe('align');
    expect(st.update(good, 2700).step).toBe('countdown');
  });

  it('losing ok during sampling restarts from align', () => {
    const st = new CaptureStage((p) => p[0].x > 0, opts);
    const good = makePose({ 0: { x: 0.5 } });
    const bad = makePose({ 0: { x: 0 } });
    st.update(good, 0);
    st.update(good, 1000); // countdown
    st.update(good, 4000); // sampling
    expect(st.update(good, 4500).step).toBe('sampling');
    expect(st.update(bad, 4600).step).toBe('align');
  });
});
