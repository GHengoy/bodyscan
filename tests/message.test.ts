import { describe, it, expect } from 'vitest';
import { postureMessage } from '../src/copy';
import type { GradedItem } from '../src/analysis/grade';

const g = (over: Partial<GradedItem>): GradedItem => ({
  id: 'shoulderTilt', grade: 'good', value: 0, severity: 0, variant: 'even', ...over,
});

describe('postureMessage', () => {
  it('fills degree and side', () => {
    const m = postureMessage(g({ grade: 'bad', value: 4.26, variant: 'left' }));
    expect(m).toContain('4.3°');
    expect(m).toContain('왼쪽');
    expect(m).not.toContain('{');
  });
  it('fills pct and variant label for knees', () => {
    const m = postureMessage(g({ id: 'kneeAlign', grade: 'bad', value: 7.81, variant: 'o' }));
    expect(m).toContain('무릎 편차 7.8%');
    expect(m).toContain('카우보이');
    expect(m).not.toContain('{');
  });
  it('head tilt message names the side the head tilts toward', () => {
    const m = postureMessage(g({ id: 'headTilt', grade: 'warn', value: 3, variant: 'right' }));
    expect(m).toContain('오른쪽으로 3.0° 기울었어요');
    expect(m).not.toContain('{');
  });
  it('fills pct for round shoulder', () => {
    expect(postureMessage(g({ id: 'roundShoulder', grade: 'warn', value: 7.04 }))).toContain('7.0%');
  });
  it('no leftover placeholders for any item/grade', () => {
    const ids = ['shoulderTilt','hipTilt','headTilt','centerDeviation','kneeAlign','forwardHead','roundShoulder','pelvicTilt','trunkLean'] as const;
    const variants: Record<string, string> = { kneeAlign: 'x', pelvicTilt: 'anterior', trunkLean: 'backward', shoulderTilt: 'right', hipTilt: 'right', headTilt: 'left' };
    for (const id of ids) for (const grade of ['good', 'warn', 'bad'] as const) {
      expect(postureMessage(g({ id, grade, value: 3, variant: variants[id] ?? '' }))).not.toMatch(/\{\w+\}/);
    }
  });
});
