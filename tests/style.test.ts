import { describe, it, expect } from 'vitest';
import { bodyTypeKey, recommendStyle, type BodyTypeKey } from '../src/analysis/style';
import { SHAPE_COPY, STYLE_COPY } from '../src/copy';

const SH = ['inverted', 'balanced', 'triangle'] as const;
const TL = ['longTorso', 'balanced', 'longLegs'] as const;

describe('style', () => {
  it('bodyTypeKey joins the two classes', () => {
    expect(bodyTypeKey({ shoulderHipType: 'inverted', torsoLegType: 'longLegs' })).toBe('inverted-longLegs');
  });
  it('all 9 combinations have 4 non-empty advice fields', () => {
    for (const s of SH) for (const t of TL) {
      const key = `${s}-${t}` as BodyTypeKey;
      const a = STYLE_COPY[key];
      expect(a.top.length).toBeGreaterThan(0);
      expect(a.bottom.length).toBeGreaterThan(0);
      expect(a.outer.length).toBeGreaterThan(0);
      expect(a.avoid.length).toBeGreaterThan(0);
      expect(recommendStyle({ shoulderHipType: s, torsoLegType: t }).key).toBe(key);
    }
  });
  it('shape copy exists for every class', () => {
    for (const s of SH) expect(SHAPE_COPY.shoulderHip[s].label.length).toBeGreaterThan(0);
    for (const t of TL) expect(SHAPE_COPY.torsoLeg[t].label.length).toBeGreaterThan(0);
  });
});
