import type { ResultData } from './result';
import { headlineCopy, SHAPE_COPY, POSTURE_COPY, postureMessage, fillTemplate, UI_TEXT, RESULT_TEXT } from '../copy';
import { drawSkeleton } from './overlay';
import type { ProductCategory } from '../ads/products';
import { siteUrl, siteHost } from '../site';

const W = 1080;
const PAD = 72;
const FONT = '-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
const C = { bg: '#0f1115', card: '#181b22', card2: '#20242d', text: '#f3f4f6', muted: '#9aa3b2', accent: '#4ade80', warn: '#fbbf24', bad: '#f87171' };

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
 * 카드 레이아웃을 한 번 "측정"으로 돌려 높이를 구하고, 같은 코드로 다시 그린다.
 * 결과 화면(result.ts)과 같은 데이터·같은 문구 함수(headlineCopy/postureMessage/SHAPE_COPY/STYLE)를 쓰므로 내용이 일치한다.
 */
function layout(ctx: CanvasRenderingContext2D, data: ResultData, draw: boolean): number {
  let y = 0;
  const text = (s: string, font: string, color: string, x = PAD) => {
    ctx.font = font;
    if (draw) { ctx.fillStyle = color; ctx.fillText(s, x, y); }
  };
  const para = (s: string, font: string, color: string, lineH: number, maxW = W - PAD * 2, x = PAD) => {
    ctx.font = font;
    for (const line of wrap(ctx, s, maxW)) {
      y += lineH;
      if (draw) { ctx.fillStyle = color; ctx.fillText(line, x, y); }
    }
  };
  const box = (h: number, color: string, x = PAD, w = W - PAD * 2, r = 24) => {
    if (draw) { ctx.fillStyle = color; roundRectPath(ctx, x, y, w, h, r); ctx.fill(); }
  };

  // 헤더
  y = 96;
  text(UI_TEXT.appName, `700 40px ${FONT}`, C.accent);
  y += 44;
  text(RESULT_TEXT.shareCardTagline, `400 28px ${FONT}`, C.muted);
  y += 30;
  text(`📵 ${UI_TEXT.cameraOff}`, `400 24px ${FONT}`, C.accent);

  // 종합 캐릭터
  const h = headlineCopy(data.headline);
  y += 60;
  para(h.title, `800 68px ${FONT}`, C.text, 82);
  y += 10;
  para(h.sub, `400 30px ${FONT}`, C.muted, 42);
  const attention = data.items.filter((i) => i.grade !== 'good').length;
  y += 18;
  para(attention === 0 ? RESULT_TEXT.allGood : RESULT_TEXT.attention(attention), `600 28px ${FONT}`, C.muted, 40);

  // 자세 9항목 (화면과 같은 순서·문구·등급)
  y += 24;
  for (const it of data.items) {
    const copy = POSTURE_COPY[it.id];
    const color = it.grade === 'bad' ? C.bad : it.grade === 'warn' ? C.warn : C.accent;
    const msgLines = (() => { ctx.font = `600 30px ${FONT}`; return wrap(ctx, postureMessage(it), W - PAD * 2 - 40); })();
    const tipLines = it.grade === 'good' ? [] : (() => { ctx.font = `400 24px ${FONT}`; return wrap(ctx, `💡 ${copy.tip}`, W - PAD * 2 - 40); })();
    const rowH = 64 + msgLines.length * 40 + tipLines.length * 32 + 20;
    box(rowH, C.card);
    const top = y;
    y += 42;
    text(copy.title, `500 24px ${FONT}`, C.muted, PAD + 20);
    // 등급 뱃지
    ctx.font = `700 22px ${FONT}`;
    const label = RESULT_TEXT.gradeLabel[it.grade];
    const bw = ctx.measureText(label).width + 28;
    if (draw) {
      ctx.fillStyle = color + '33';
      roundRectPath(ctx, W - PAD - 20 - bw, top + 18, bw, 36, 18);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillText(label, W - PAD - 20 - bw + 14, top + 44);
    }
    ctx.font = `600 30px ${FONT}`;
    for (const l of msgLines) { y += 40; if (draw) { ctx.fillStyle = C.text; ctx.fillText(l, PAD + 20, y); } }
    ctx.font = `400 24px ${FONT}`;
    for (const l of tipLines) { y += 32; if (draw) { ctx.fillStyle = C.muted; ctx.fillText(l, PAD + 20, y); } }
    y = top + rowH + 12;
  }

  // 스켈레톤 도식 (정면·측면) — 영상 픽셀 없음, 랜드마크 선·점만
  y += 20;
  const diagH = 460;
  const diagW = Math.min(Math.round(diagH * data.aspect), 440);
  const gap = 24;
  const startX = (W - (diagW * 2 + gap)) / 2;
  const poses: Array<[typeof data.frontPose, string]> = [[data.frontPose, RESULT_TEXT.diagramFront], [data.sidePose, RESULT_TEXT.diagramSide]];
  poses.forEach(([pose, caption], i) => {
    const x = startX + i * (diagW + gap);
    if (draw) {
      ctx.fillStyle = C.card2;
      roundRectPath(ctx, x, y, diagW, diagH, 24);
      ctx.fill();
      ctx.save();
      ctx.translate(x + diagW, y); // 미러링: 화면과 동일
      ctx.scale(-1, 1);
      drawSkeleton(ctx, pose, diagW, diagH, { color: C.accent, lineWidth: 5, minVisibility: 0.4 });
      ctx.restore();
      ctx.fillStyle = C.muted;
      ctx.font = `500 24px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(caption, x + diagW / 2, y + diagH + 36);
      ctx.textAlign = 'left';
    }
  });
  y += diagH + 56;

  // 체형 비율
  const sh = SHAPE_COPY.shoulderHip[data.proportion.shoulderHipType];
  const tl = SHAPE_COPY.torsoLeg[data.proportion.torsoLegType];
  y += 30;
  text(RESULT_TEXT.proportionTitle, `700 34px ${FONT}`, C.text);
  y += 24;
  const half = (W - PAD * 2 - 20) / 2;
  const shapeTop = y;
  const descLines = [sh, tl].map((s) => { ctx.font = `400 22px ${FONT}`; return wrap(ctx, s.desc, half - 40); });
  const shapeH = 150 + Math.max(...descLines.map((d) => d.length)) * 30;
  [sh, tl].forEach((s, i) => {
    const x = PAD + i * (half + 20);
    if (draw) {
      ctx.fillStyle = C.card2;
      roundRectPath(ctx, x, shapeTop, half, shapeH, 20);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = C.text;
      ctx.font = `400 56px ${FONT}`;
      ctx.fillText(s.emoji, x + half / 2, shapeTop + 74);
      ctx.font = `700 30px ${FONT}`;
      ctx.fillText(s.label, x + half / 2, shapeTop + 122);
      ctx.fillStyle = C.muted;
      ctx.font = `400 22px ${FONT}`;
      descLines[i].forEach((l, k) => ctx.fillText(l, x + half / 2, shapeTop + 158 + k * 30));
      ctx.textAlign = 'left';
    }
  });
  y = shapeTop + shapeH + 44;
  const p = data.proportion;
  text(
    `${RESULT_TEXT.ratioShoulderHip} ${p.shoulderHipRatio.toFixed(2)}    ${RESULT_TEXT.ratioTorsoLeg} ${p.torsoLegRatio.toFixed(2)}    ${RESULT_TEXT.ratioThighCalf} ${p.thighCalfRatio.toFixed(2)}`,
    `400 26px ${FONT}`, C.muted,
  );

  // 어울리는 스타일 (화면과 같은 4줄)
  y += 60;
  text(RESULT_TEXT.styleTitle, `700 34px ${FONT}`, C.text);
  y += 14;
  const cats: ProductCategory[] = ['top', 'bottom', 'outer'];
  const styleLines: Array<[string, string]> = [
    ...cats.map((c): [string, string] => [`${RESULT_TEXT.categoryEmoji[c]} ${RESULT_TEXT.categoryLabel[c]}`, data.style[c]]),
    [RESULT_TEXT.avoidLabel, data.style.avoid],
  ];
  for (const [k, v] of styleLines) {
    y += 20;
    const lines = (() => { ctx.font = `500 26px ${FONT}`; return wrap(ctx, v, W - PAD * 2 - 40); })();
    const rowH = 46 + lines.length * 36 + 14;
    box(rowH, C.card2, PAD, W - PAD * 2, 18);
    const top = y;
    y += 38;
    text(k, `500 22px ${FONT}`, C.muted, PAD + 20);
    ctx.font = `500 26px ${FONT}`;
    for (const l of lines) { y += 36; if (draw) { ctx.fillStyle = C.text; ctx.fillText(l, PAD + 20, y); } }
    y = top + rowH;
  }

  // 면책 + 푸터
  y += 44;
  para(UI_TEXT.disclaimer, `400 22px ${FONT}`, C.muted, 30);
  y += 44;
  text(RESULT_TEXT.shareCardFooter, `500 24px ${FONT}`, C.accent);
  y += 40;
  text(fillTemplate(RESULT_TEXT.shareCardCta, { host: siteHost() }), `700 28px ${FONT}`, C.text);
  return y + PAD;
}

/**
 * 결과 카드 PNG. 결과 화면과 같은 내용(캐릭터, 9항목, 도식, 비율, 스타일)을 같은 문구로 담는다.
 * 비디오 프레임은 절대 그리지 않는다(drawImage(video) 금지). 높이는 내용에 맞춰 정해진다.
 */
export function renderShareCard(data: ResultData): HTMLCanvasElement {
  const probe = document.createElement('canvas');
  probe.width = W;
  probe.height = 10;
  const height = Math.ceil(layout(probe.getContext('2d')!, data, false));

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, height);
  layout(ctx, data, true);
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

/** 카드 PNG + 테스트 링크를 함께 공유한다(받는 사람이 바로 들어올 수 있게) */
export async function shareResult(canvas: HTMLCanvasElement, headlineTitle: string): Promise<'shared' | 'unsupported' | 'cancelled' | 'failed'> {
  if (!canShareFiles()) return 'unsupported';
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return 'failed';
  const file = new File([blob], 'bodyscan-result.png', { type: 'image/png' });
  const text = fillTemplate(RESULT_TEXT.shareText, { title: headlineTitle });
  try {
    await navigator.share({ files: [file], title: RESULT_TEXT.shareTitle, text: `${text} ${siteUrl()}`, url: siteUrl() });
    return 'shared';
  } catch (e) {
    return (e as DOMException)?.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
