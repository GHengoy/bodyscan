import type { ResultData } from './result';
import { headlineCopy, SHAPE_COPY, POSTURE_COPY, postureMessage, UI_TEXT, RESULT_TEXT } from '../copy';
import { drawSkeleton } from './overlay';

const W = 1080;
const H = 1350;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of text) {
    const next = cur + ch;
    if (ctx.measureText(next).width > maxWidth && cur) {
      lines.push(cur);
      cur = ch;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * 결과 카드 PNG. 수치·문구·스켈레톤 도식만 그린다.
 * 비디오 프레임은 절대 그리지 않는다(drawImage(video) 금지).
 */
export function renderShareCard(data: ResultData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const font = '-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

  ctx.fillStyle = '#0f1115';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#4ade80';
  ctx.font = `700 40px ${font}`;
  ctx.fillText(UI_TEXT.appName, 72, 110);
  ctx.fillStyle = '#9aa3b2';
  ctx.font = `400 28px ${font}`;
  ctx.fillText(RESULT_TEXT.shareCardTagline, 72, 155);

  const h = headlineCopy(data.headline);
  ctx.fillStyle = '#f3f4f6';
  ctx.font = `800 72px ${font}`;
  let y = 290;
  for (const line of wrap(ctx, h.title, W - 144)) {
    ctx.fillText(line, 72, y);
    y += 86;
  }
  ctx.fillStyle = '#9aa3b2';
  ctx.font = `400 32px ${font}`;
  for (const line of wrap(ctx, h.sub, W - 144)) {
    ctx.fillText(line, 72, y);
    y += 44;
  }

  // 스켈레톤 도식 (오른쪽)
  const diagH = 520, diagW = Math.round(diagH * data.aspect);
  const dx = W - 72 - diagW, dy = y + 30;
  ctx.fillStyle = '#181b22';
  roundRectPath(ctx, dx, dy, diagW, diagH, 24);
  ctx.fill();
  ctx.save();
  ctx.translate(dx + diagW, dy);
  ctx.scale(-1, 1);
  drawSkeleton(ctx, data.frontPose, diagW, diagH, { color: '#4ade80', lineWidth: 5, minVisibility: 0.4 });
  ctx.restore();

  // 항목 요약 (왼쪽) — 주의 이상 우선, 최대 4개
  const sorted = [...data.items].sort((a, b) => b.severity - a.severity).slice(0, 4);
  let iy = dy + 20;
  const maxTextW = dx - 72 - 30;
  for (const it of sorted) {
    const color = it.grade === 'bad' ? '#f87171' : it.grade === 'warn' ? '#fbbf24' : '#4ade80';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(84, iy - 12, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9aa3b2';
    ctx.font = `600 26px ${font}`;
    ctx.fillText(POSTURE_COPY[it.id].title, 110, iy);
    ctx.fillStyle = '#f3f4f6';
    ctx.font = `500 28px ${font}`;
    const lines = wrap(ctx, postureMessage(it), maxTextW);
    for (const l of lines.slice(0, 2)) {
      iy += 38;
      ctx.fillText(l, 110, iy);
    }
    iy += 56;
  }

  // 체형 비율
  const sh = SHAPE_COPY.shoulderHip[data.proportion.shoulderHipType];
  const tl = SHAPE_COPY.torsoLeg[data.proportion.torsoLegType];
  const by = Math.max(dy + diagH, iy) + 70;
  ctx.fillStyle = '#f3f4f6';
  ctx.font = `700 36px ${font}`;
  ctx.fillText(`${sh.emoji} ${sh.label}  ·  ${tl.emoji} ${tl.label}`, 72, by);
  ctx.fillStyle = '#9aa3b2';
  ctx.font = `400 28px ${font}`;
  ctx.fillText(
    `${RESULT_TEXT.ratioShoulderHip} ${data.proportion.shoulderHipRatio.toFixed(2)}   ${RESULT_TEXT.ratioTorsoLeg} ${data.proportion.torsoLegRatio.toFixed(2)}`,
    72, by + 46,
  );

  ctx.fillStyle = '#4ade80';
  ctx.font = `500 26px ${font}`;
  ctx.fillText(RESULT_TEXT.shareCardFooter, 72, H - 72);
  return canvas;
}

export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

export async function shareResult(canvas: HTMLCanvasElement): Promise<'shared' | 'unsupported' | 'cancelled' | 'failed'> {
  if (!canShareFiles()) return 'unsupported';
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return 'failed';
  const file = new File([blob], 'bodyscan-result.png', { type: 'image/png' });
  try {
    await navigator.share({ files: [file], title: RESULT_TEXT.shareTitle, text: RESULT_TEXT.shareText });
    return 'shared';
  } catch (e) {
    return (e as DOMException)?.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
