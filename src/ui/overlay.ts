import { POSE_CONNECTIONS, type Pose } from '../pose/landmarks';

export interface SkeletonOptions {
  color?: string;
  lineWidth?: number;
  minVisibility?: number;
}

/** 정규화 좌표 포즈를 w×h 캔버스에 선·점으로 그린다. 영상 픽셀은 그리지 않는다. */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  w: number,
  h: number,
  opts: SkeletonOptions = {},
): void {
  const color = opts.color ?? '#4ade80';
  const lw = opts.lineWidth ?? Math.max(2, w / 180);
  const minVis = opts.minVisibility ?? 0.5;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  for (const [a, b] of POSE_CONNECTIONS) {
    const pa = pose[a], pb = pose[b];
    if (pa.visibility < minVis || pb.visibility < minVis) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
    ctx.stroke();
  }
  for (const p of pose) {
    if (p.visibility < minVis) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, lw * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 전신이 들어와야 하는 영역을 안내하는 실루엣. ok면 녹색, 아니면 흰색 점선. */
export function drawGuide(ctx: CanvasRenderingContext2D, w: number, h: number, ok: boolean): void {
  ctx.save();
  ctx.strokeStyle = ok ? 'rgba(74,222,128,0.9)' : 'rgba(255,255,255,0.6)';
  ctx.lineWidth = Math.max(2, w / 200);
  ctx.setLineDash(ok ? [] : [12, 10]);
  const headR = h * 0.06;
  const cx = w / 2;
  ctx.beginPath();
  ctx.arc(cx, h * 0.12, headR, 0, Math.PI * 2);
  ctx.stroke();
  const bx = w * 0.22, by = h * 0.2, bw = w * 0.56, bh = h * 0.74, r = w * 0.12;
  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
  ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
  ctx.arcTo(bx, by + bh, bx, by, r);
  ctx.arcTo(bx, by, bx + bw, by, r);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** 중앙 원형 진행 링(0..1) */
export function drawProgressRing(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number): void {
  if (progress <= 0) return;
  ctx.save();
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = Math.max(4, w / 90);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress));
  ctx.stroke();
  ctx.restore();
}
