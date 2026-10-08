import type { FrontMetrics } from '../analysis/front';
import type { SideMetrics } from '../analysis/side';
import type { ProportionMetrics } from '../analysis/proportion';
import type { GradedItem, Headline } from '../analysis/grade';
import type { BodyTypeKey } from '../analysis/style';
import type { Pose } from '../pose/landmarks';
import { pickProduct, type Product, type ProductCategory } from '../ads/products';
import { mountBanner, AD_SLOTS } from '../ads/banner';
import { drawSkeleton } from './overlay';
import { renderShareCard, shareResult, canShareFiles } from './shareCard';
import {
  UI_TEXT, RESULT_TEXT, POSTURE_COPY, SHAPE_COPY, headlineCopy, postureMessage, type StyleAdvice,
} from '../copy';

export interface ResultData {
  front: FrontMetrics;
  side: SideMetrics;
  proportion: ProportionMetrics;
  items: GradedItem[];
  headline: Headline;
  style: StyleAdvice & { key: BodyTypeKey };
  frontPose: Pose;
  sidePose: Pose;
  aspect: number;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function itemCard(item: GradedItem): string {
  const c = POSTURE_COPY[item.id];
  return `
  <div class="item">
    <div class="title">${c.title}</div>
    <span class="badge ${item.grade}">${RESULT_TEXT.gradeLabel[item.grade]}</span>
    <div class="msg">${postureMessage(item)}</div>
    ${item.grade === 'good' ? '' : `<div class="tip">💡 ${c.tip}</div>`}
  </div>`;
}

function productHtml(p: Product | null, cat: ProductCategory): string {
  if (!p || !/^https?:\/\//i.test(p.url)) return `<div class="ad-slot" data-slot="native-${cat}"></div>`;
  const thumb = p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy" />` : RESULT_TEXT.categoryEmoji[cat];
  return `
  <a class="product" href="${esc(p.url)}" target="_blank" rel="noopener sponsored">
    <div class="thumb">${thumb}</div>
    <div>
      <div class="name">${esc(p.name)}</div>
      <div class="price">${esc(p.price)}</div>
      <div class="cta">${RESULT_TEXT.productCta}</div>
    </div>
  </a>`;
}

export function renderResult(
  root: HTMLElement,
  data: ResultData,
  deps: { products: Product[]; onRetry: () => void },
): void {
  const h = headlineCopy(data.headline);
  const attention = data.items.filter((i) => i.grade !== 'good').length;
  const sh = SHAPE_COPY.shoulderHip[data.proportion.shoulderHipType];
  const tl = SHAPE_COPY.torsoLeg[data.proportion.torsoLegType];
  const cats: ProductCategory[] = ['top', 'bottom', 'outer'];

  root.innerHTML = `
  <main class="screen result">
    <div class="camera-off">📷 ${UI_TEXT.cameraOff}</div>
    <section class="headline">
      <h1>${h.title}</h1>
      <p class="sub">${h.sub}</p>
    </section>
    <p class="summary">${attention === 0 ? RESULT_TEXT.allGood : RESULT_TEXT.attention(attention)}</p>
    <section class="items">${data.items.map(itemCard).join('')}</section>
    <div class="ad-slot" data-slot="result1"></div>
    <section class="card">
      <h2>${RESULT_TEXT.proportionTitle}</h2>
      <div class="shape">
        <div class="box"><div class="emoji">${sh.emoji}</div><div class="label">${sh.label}</div><div class="desc">${sh.desc}</div></div>
        <div class="box"><div class="emoji">${tl.emoji}</div><div class="label">${tl.label}</div><div class="desc">${tl.desc}</div></div>
      </div>
      <div class="ratios">
        <span>${RESULT_TEXT.ratioShoulderHip} ${data.proportion.shoulderHipRatio.toFixed(2)}</span>
        <span>${RESULT_TEXT.ratioTorsoLeg} ${data.proportion.torsoLegRatio.toFixed(2)}</span>
        <span>${RESULT_TEXT.ratioThighCalf} ${data.proportion.thighCalfRatio.toFixed(2)}</span>
      </div>
    </section>
    <section class="card">
      <h2>${RESULT_TEXT.styleTitle}</h2>
      <div class="style-row">
        ${cats.map((cat) => `
          <div class="style-item">
            <div class="k">${RESULT_TEXT.categoryEmoji[cat]} ${RESULT_TEXT.categoryLabel[cat]}</div>
            <div>${data.style[cat]}</div>
            ${productHtml(pickProduct(deps.products, data.style.key, cat), cat)}
          </div>`).join('')}
        <div class="style-item"><div class="k">${RESULT_TEXT.avoidLabel}</div><div>${data.style.avoid}</div></div>
      </div>
    </section>
    <section class="diagrams">
      <figure><canvas id="diag-front" width="180" height="320"></canvas><figcaption>${RESULT_TEXT.diagramFront}</figcaption></figure>
      <figure><canvas id="diag-side" width="180" height="320"></canvas><figcaption>${RESULT_TEXT.diagramSide}</figcaption></figure>
    </section>
    <p class="fineprint">${UI_TEXT.disclaimer}</p>
    <div class="actions">
      <button id="share-btn" class="primary">${UI_TEXT.share}</button>
      <button id="retry-btn" class="secondary">${UI_TEXT.retry}</button>
    </div>
    <div class="ad-slot" data-slot="result2"></div>
  </main>`;

  drawDiagram(root.querySelector<HTMLCanvasElement>('#diag-front')!, data.frontPose, data.aspect);
  drawDiagram(root.querySelector<HTMLCanvasElement>('#diag-side')!, data.sidePose, data.aspect);

  mountBanner(root.querySelector('[data-slot="result1"]')!, AD_SLOTS.result1);
  mountBanner(root.querySelector('[data-slot="result2"]')!, AD_SLOTS.result2);
  root.querySelectorAll<HTMLElement>('[data-slot^="native-"]').forEach((el) => mountBanner(el, AD_SLOTS.native));

  const shareBtn = root.querySelector<HTMLButtonElement>('#share-btn')!;
  if (!canShareFiles()) {
    shareBtn.disabled = true;
    shareBtn.textContent = UI_TEXT.shareUnsupported;
  } else {
    shareBtn.onclick = async () => {
      shareBtn.disabled = true;
      try {
        await shareResult(renderShareCard(data));
      } finally {
        shareBtn.disabled = false;
      }
    };
  }
  root.querySelector<HTMLButtonElement>('#retry-btn')!.onclick = deps.onRetry;
}

/** 캔버스에 포즈만 그린다(영상 없음). 종횡비를 유지한 채 균일 배율로 가운데 배치(가로 영상 대응). */
function drawDiagram(canvas: HTMLCanvasElement, pose: Pose, aspect: number): void {
  const ctx = canvas.getContext('2d')!;
  const H = canvas.height;
  const s = Math.min(canvas.width / aspect, H);
  const W = s * aspect, H2 = s;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate((canvas.width - W) / 2, (H - H2) / 2);
  // 미러링: 사용자가 거울처럼 본 모습과 같게
  ctx.translate(W, 0);
  ctx.scale(-1, 1);
  drawSkeleton(ctx, pose, W, H2, { color: '#4ade80', lineWidth: 3, minVisibility: 0.4 });
  ctx.restore();
}
