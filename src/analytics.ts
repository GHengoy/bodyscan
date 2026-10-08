/**
 * 선택적 방문 통계(Google Analytics 4). VITE_GA_ID가 비어 있으면 아무것도 하지 않는다.
 * 광고 스크립트와 같은 규칙: 카메라가 켜질 수 있는 문서에서는 절대 로드하지 않는다 →
 * main.ts가 시작 화면 문서와 결과 화면(카메라 종료 후)에서만 enableAnalytics()를 부른다.
 * 영상·랜드마크는 보내지 않으며, 페이지뷰와 아래 이벤트 이름만 전송한다.
 */
const GA_ID = (import.meta.env.VITE_GA_ID as string | undefined) || undefined;
let loaded = false;

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window { dataLayer?: unknown[]; gtag?: Gtag }
}

export function enableAnalytics(): void {
  if (!GA_ID || loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) { window.dataLayer!.push(args); } as Gtag;
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { anonymize_ip: true });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
}

/** 이벤트: measure_complete(headline), share(method), product_click(category) */
export function track(event: string, params: Record<string, string | number> = {}): void {
  if (!loaded || !window.gtag) return;
  window.gtag('event', event, params);
}
