import { describe, it, expect } from 'vitest';
import { LM } from '../src/pose/landmarks';
import { analyzeProportion, classifyShoulderHip, classifyTorsoLeg } from '../src/analysis/proportion';
import { standingFront } from './helpers';

describe('classify', () => {
  it('shoulder:hip boundaries', () => {
    expect(classifyShoulderHip(1.2)).toBe('inverted');
    expect(classifyShoulderHip(1.15)).toBe('balanced');
    expect(classifyShoulderHip(0.9)).toBe('balanced');
    expect(classifyShoulderHip(0.85)).toBe('triangle');
  });
  it('torso:leg boundaries', () => {
    expect(classifyTorsoLeg(0.7)).toBe('longTorso');
    expect(classifyTorsoLeg(0.62)).toBe('balanced');
    expect(classifyTorsoLeg(0.52)).toBe('balanced');
    expect(classifyTorsoLeg(0.5)).toBe('longLegs');
  });
});

describe('analyzeProportion', () => {
  it('ideal pose is balanced/balanced', () => {
    const m = analyzeProportion(standingFront(), 1);
    expect(m.shoulderHipRatio).toBeCloseTo(0.24 / 0.22, 2);
    expect(m.torsoLegRatio).toBeCloseTo(0.22 / 0.38, 2);
    expect(m.thighCalfRatio).toBeCloseTo(1, 1);
    expect(m.shoulderHipType).toBe('balanced');
    expect(m.torsoLegType).toBe('balanced');
  });
  it('wide shoulders → inverted', () => {
    const p = standingFront();
    p[LM.LEFT_SHOULDER].x = 0.65;
    p[LM.RIGHT_SHOULDER].x = 0.35;
    expect(analyzeProportion(p, 1).shoulderHipType).toBe('inverted');
  });
  it('low hips → longTorso', () => {
    const p = standingFront();
    p[LM.LEFT_HIP].y = 0.6;
    p[LM.RIGHT_HIP].y = 0.6;
    expect(analyzeProportion(p, 1).torsoLegType).toBe('longTorso');
  });
});
