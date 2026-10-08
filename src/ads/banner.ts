import { UI_TEXT } from '../copy';

const CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined) || undefined;

export const AD_SLOTS = {
  start: (import.meta.env.VITE_ADSENSE_SLOT_START as string | undefined) || undefined,
  result1: (import.meta.env.VITE_ADSENSE_SLOT_RESULT_1 as string | undefined) || undefined,
  result2: (import.meta.env.VITE_ADSENSE_SLOT_RESULT_2 as string | undefined) || undefined,
  native: (import.meta.env.VITE_ADSENSE_SLOT_NATIVE as string | undefined) || undefined,
};

let scriptLoaded = false;
/**
 * 카메라가 켜질 수 있는 문서에서는 광고 스크립트를 절대 로드하지 않는다.
 * 시작 화면 문서, 또는 측정 문서에서 카메라를 완전히 끈 뒤(결과 화면)에만 true로 바꾼다.
 */
let adsAllowed = false;

export function setAdsAllowed(allowed: boolean): void {
  adsAllowed = allowed;
}

export function isAdsAllowed(): boolean {
  return adsAllowed;
}

function ensureScript(): void {
  if (scriptLoaded || !CLIENT || !adsAllowed) return;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CLIENT)}`;
  document.head.appendChild(s);
  scriptLoaded = true;
}

/**
 * 광고는 start/result 화면에서만 마운트한다. 카메라 화면에서는 호출 금지.
 * client·slot이 없거나 광고가 허용되지 않은 상태(setAdsAllowed)면 플레이스홀더만 그린다.
 */
export function mountBanner(el: HTMLElement, slot: string | undefined): void {
  el.innerHTML = '';
  if (!CLIENT || !slot || !adsAllowed) {
    el.innerHTML = `<div class="ad-placeholder">${UI_TEXT.adPlaceholder}</div>`;
    return;
  }
  ensureScript();
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.dataset.adClient = CLIENT;
  ins.dataset.adSlot = slot;
  ins.dataset.adFormat = 'auto';
  ins.dataset.fullWidthResponsive = 'true';
  el.appendChild(ins);
  const w = window as unknown as { adsbygoogle?: unknown[] };
  (w.adsbygoogle = w.adsbygoogle || []).push({});
}

export function unmountBanners(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.ad-slot').forEach((el) => (el.innerHTML = ''));
}
