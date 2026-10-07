import { describe, it, expect } from 'vitest';
import {
  toPlane, dist, mid, lineTiltDeg, angleFromVerticalDeg, angleAtDeg, xOnLineAtY,
} from '../src/analysis/geometry';

describe('geometry', () => {
  it('toPlane scales x by aspect', () => {
    expect(toPlane({ x: 0.5, y: 0.5, z: 0, visibility: 1 }, 0.5)).toEqual({ x: 0.25, y: 0.5 });
  });

  it('dist / mid', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(mid({ x: 0, y: 0 }, { x: 2, y: 4 })).toEqual({ x: 1, y: 2 });
  });

  it('lineTiltDeg: horizontal is 0, b lower is positive, normalized to [-90,90]', () => {
    expect(lineTiltDeg({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0);
    expect(lineTiltDeg({ x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(45);
    expect(lineTiltDeg({ x: 1, y: 1 }, { x: 0, y: 0 })).toBeCloseTo(45); // 방향 무관
    expect(lineTiltDeg({ x: 0, y: 0 }, { x: 1, y: -1 })).toBeCloseTo(-45);
  });

  it('angleFromVerticalDeg: straight up is 0, leaning +x is positive', () => {
    expect(angleFromVerticalDeg({ x: 0, y: 1 }, { x: 0, y: 0 })).toBeCloseTo(0);
    expect(angleFromVerticalDeg({ x: 0, y: 1 }, { x: 1, y: 0 })).toBeCloseTo(45);
    expect(angleFromVerticalDeg({ x: 0, y: 1 }, { x: -1, y: 0 })).toBeCloseTo(-45);
  });

  it('angleAtDeg: interior angle at b', () => {
    expect(angleAtDeg({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 })).toBeCloseTo(180);
    expect(angleAtDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90);
    expect(angleAtDeg({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 })).toBe(0); // 퇴화
  });

  it('xOnLineAtY interpolates x of line a→b at given y', () => {
    expect(xOnLineAtY({ x: 0, y: 0 }, { x: 2, y: 2 }, 1)).toBeCloseTo(1);
    expect(xOnLineAtY({ x: 1, y: 0 }, { x: 1, y: 5 }, 3)).toBeCloseTo(1);
    expect(xOnLineAtY({ x: 1, y: 2 }, { x: 4, y: 2 }, 2)).toBeCloseTo(1); // 수평선: a.x 반환
  });
});
