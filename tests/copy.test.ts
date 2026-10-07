import { describe, it, expect } from 'vitest';
import { POSTURE_COPY, HEADLINES, headlineCopy, fillTemplate } from '../src/copy';
import type { PostureItemId } from '../src/analysis/grade';

const IDS: PostureItemId[] = [
  'shoulderTilt', 'hipTilt', 'headTilt', 'centerDeviation', 'kneeAlign',
  'forwardHead', 'roundShoulder', 'pelvicTilt', 'trunkLean',
];

describe('copy completeness', () => {
  it('every posture item has title, 3 grades and a tip', () => {
    for (const id of IDS) {
      const c = POSTURE_COPY[id];
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.good.length).toBeGreaterThan(0);
      expect(c.warn.length).toBeGreaterThan(0);
      expect(c.bad.length).toBeGreaterThan(0);
      expect(c.tip.length).toBeGreaterThan(0);
    }
  });
  it('headline exists for every id (and variants) and perfect', () => {
    expect(HEADLINES.perfect.title).toContain('운동선수');
    expect(headlineCopy({ id: 'forwardHead', variant: '' }).title).toContain('거북이');
    expect(headlineCopy({ id: 'kneeAlign', variant: 'o' }).title).toContain('카우보이');
    expect(headlineCopy({ id: 'kneeAlign', variant: 'x' }).title).toContain('펭귄');
    expect(headlineCopy({ id: 'pelvicTilt', variant: 'anterior' }).title).toContain('오리');
    expect(headlineCopy({ id: 'pelvicTilt', variant: 'posterior' }).title).toContain('곰');
    for (const id of IDS) {
      expect(headlineCopy({ id, variant: 'left' }).title.length).toBeGreaterThan(0);
    }
  });
  it('fillTemplate replaces placeholders', () => {
    expect(fillTemplate('{deg}° 기울어진 {side}', { deg: 4.2, side: '왼쪽' })).toBe('4.2° 기울어진 왼쪽');
  });
});
