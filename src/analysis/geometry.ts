import type { Point } from '../pose/landmarks';

export interface Vec2 {
  x: number;
  y: number;
}

/** 정규화 좌표 → 종횡비 보정 평면 좌표 (x에 aspect=width/height 곱) */
export function toPlane(p: Point, aspect: number): Vec2 {
  return { x: p.x * aspect, y: p.y };
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function mid(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/** 선 a→b의 수평 대비 기울기(도). [-90, 90]. b가 더 아래(y 큼)면 양수. 방향 무관. */
export function lineTiltDeg(a: Vec2, b: Vec2): number {
  let deg = toDeg(Math.atan2(b.y - a.y, b.x - a.x));
  if (deg > 90) deg -= 180;
  if (deg < -90) deg += 180;
  return deg;
}

/** 벡터 from→to가 "위쪽(-y)"에서 벗어난 부호 있는 각도(도). +x 쪽으로 기울면 양수. */
export function angleFromVerticalDeg(from: Vec2, to: Vec2): number {
  return toDeg(Math.atan2(to.x - from.x, -(to.y - from.y)));
}

/** b에서의 내각(도) [0, 180]. 퇴화(길이 0)면 0. */
export function angleAtDeg(a: Vec2, b: Vec2, c: Vec2): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const n = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (n === 0) return 0;
  const cos = (v1.x * v2.x + v1.y * v2.y) / n;
  return toDeg(Math.acos(Math.max(-1, Math.min(1, cos))));
}

/** 선 a→b 위에서 y가 주어진 값일 때의 x. 수평선이면 a.x. */
export function xOnLineAtY(a: Vec2, b: Vec2, y: number): number {
  const dy = b.y - a.y;
  if (Math.abs(dy) < 1e-9) return a.x;
  const t = (y - a.y) / dy;
  return a.x + (b.x - a.x) * t;
}
