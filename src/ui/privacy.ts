import { UI_TEXT } from '../copy';

export interface PrivacyIndicator {
  start(): void;
  stop(): void;
  readonly count: number;
}

/**
 * 측정 중 네트워크 요청이 0건임을 사용자에게 보여준다.
 * start() 이후 시작된 리소스 요청만 센다(모델/WASM 로딩은 start 전에 끝나야 한다).
 * 광고 iframe 내부 요청은 메인 문서 타임라인에 잡히지 않는다 — 그래서 광고는 카메라 화면에 두지 않는다.
 */
export function createPrivacyIndicator(el: HTMLElement): PrivacyIndicator {
  let count = 0;
  let startTime = 0;
  let observer: PerformanceObserver | null = null;

  const render = () => {
    el.textContent = count === 0 ? UI_TEXT.privacyOk : UI_TEXT.privacyBad(count);
    el.classList.toggle('bad', count > 0);
  };

  return {
    start() {
      count = 0;
      startTime = performance.now();
      render();
      if (typeof PerformanceObserver === 'undefined') return;
      observer?.disconnect();
      observer = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (e.startTime >= startTime) count++;
        render();
      });
      observer.observe({ type: 'resource', buffered: false });
    },
    stop() {
      observer?.disconnect();
      observer = null;
    },
    get count() {
      return count;
    },
  };
}
