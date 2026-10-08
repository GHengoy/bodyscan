import { UI_TEXT } from '../copy';

export interface PrivacyIndicator {
  start(): void;
  stop(): void;
  readonly count: number;
}

/**
 * 측정 중 네트워크 요청이 0건임을 사용자에게 보여준다.
 * start() 이후 시작된 리소스 요청만 센다(모델/WASM 로딩은 start 전에 끝나야 한다).
 * 광고 스크립트는 카메라가 꺼진 뒤에만 로드된다(측정은 별도 문서) — 그래서 측정 중 요청은 0건이어야 한다.
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
