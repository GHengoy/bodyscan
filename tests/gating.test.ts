import { describe, it, expect } from 'vitest';
import { LM } from '../src/pose/landmarks';
import {
  fullBodyVisible, shoulderTorsoRatio, isFacingFront, isFacingSide, pickVisibleSide, HoldTimer,
} from '../src/pose/gating';
import { standingFront, standingSide } from './helpers';

describe('fullBodyVisible', () => {
  it('true for ideal standing pose', () => {
    expect(fullBodyVisible(standingFront())).toBe(true);
  });
  it('false when an ankle is low visibility', () => {
    const p = standingFront();
    p[LM.LEFT_ANKLE].visibility = 0.3;
    expect(fullBodyVisible(p)).toBe(false);
  });
  it('false when nose is out of frame', () => {
    const p = standingFront();
    p[LM.NOSE].y = 0.01;
    expect(fullBodyVisible(p)).toBe(false);
  });
});

describe('facing', () => {
  it('front pose: ratio ≈ 1.09, isFacingFront true, isFacingSide false', () => {
    const p = standingFront();
    expect(shoulderTorsoRatio(p, 1)).toBeCloseTo(0.24 / 0.22, 2);
    expect(isFacingFront(p, 1)).toBe(true);
    expect(isFacingSide(p, 1)).toBe(false);
  });
  it('side pose: ratio 0, isFacingSide true, isFacingFront false', () => {
    const p = standingSide('right');
    expect(shoulderTorsoRatio(p, 1)).toBeCloseTo(0);
    expect(isFacingSide(p, 1)).toBe(true);
    expect(isFacingFront(p, 1)).toBe(false);
  });
  it('aspect correction: narrow portrait video shrinks shoulder width', () => {
    const p = standingFront();
    expect(shoulderTorsoRatio(p, 0.5625)).toBeCloseTo((0.24 * 0.5625) / 0.22, 2);
  });
  it('pickVisibleSide picks the side with higher summed visibility', () => {
    expect(pickVisibleSide(standingSide('right'))).toBe('right');
    expect(pickVisibleSide(standingSide('left'))).toBe('left');
  });
  it('isFacingSide false when visible-side knee is hidden', () => {
    const p = standingSide('right');
    p[LM.RIGHT_KNEE].visibility = 0.2;
    expect(isFacingSide(p, 1)).toBe(false);
  });
});

describe('HoldTimer', () => {
  it('returns true only after ok held for holdMs', () => {
    const t = new HoldTimer(1500);
    expect(t.update(true, 0)).toBe(false);
    expect(t.update(true, 1000)).toBe(false);
    expect(t.progress(1000)).toBeCloseTo(1000 / 1500);
    expect(t.update(true, 1500)).toBe(true);
  });
  it('resets when ok becomes false', () => {
    const t = new HoldTimer(1000);
    t.update(true, 0);
    expect(t.update(false, 900)).toBe(false);
    expect(t.progress(900)).toBe(0);
    expect(t.update(true, 1000)).toBe(false);
    expect(t.update(true, 2000)).toBe(true);
  });
});
