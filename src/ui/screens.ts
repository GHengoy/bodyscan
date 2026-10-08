import { UI_TEXT } from '../copy';

export function startScreen(): string {
  return `
  <main class="screen start">
    <header class="hero">
      <h1>${UI_TEXT.appName}</h1>
      <p class="tagline">${UI_TEXT.tagline}</p>
      <p class="privacy-claim">🔒 ${UI_TEXT.privacyClaim}</p>
    </header>
    <section class="card guide">
      <h2>${UI_TEXT.guideTitle}</h2>
      <ol>${UI_TEXT.guide.map((g) => `<li>${g}</li>`).join('')}</ol>
    </section>
    <button id="start-btn" class="primary">${UI_TEXT.startButton}</button>
    <p class="fineprint">${UI_TEXT.disclaimer}</p>
    <div class="ad-slot" data-slot="start"></div>
    <section class="faq">
      ${UI_TEXT.faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}
    </section>
  </main>`;
}

export function cameraScreen(): string {
  return `
  <main class="screen camera">
    <div id="privacy" class="privacy-indicator">${UI_TEXT.loadingModel}</div>
    <div class="cam-wrap">
      <div class="cam-stage">
        <video id="video" autoplay playsinline muted></video>
        <canvas id="overlay"></canvas>
      </div>
      <div id="countdown" class="countdown"></div>
      <div id="status" class="status">${UI_TEXT.loadingModel}</div>
    </div>
    <div class="cam-controls">
      <label><input type="checkbox" id="toggle-skeleton" /> ${UI_TEXT.skeletonOnly}</label>
      <label><input type="checkbox" id="toggle-voice" checked /> ${UI_TEXT.voice}</label>
    </div>
  </main>`;
}

export function errorScreen(title: string, body: string, retryLabel: string): string {
  return `
  <main class="screen error">
    <section class="card">
      <h2>${title}</h2>
      <p>${body}</p>
      <button id="retry-btn" class="primary">${retryLabel}</button>
    </section>
  </main>`;
}

export function desktopScreen(): string {
  return `
  <main class="screen desktop">
    <section class="card center">
      <h2>${UI_TEXT.desktopTitle}</h2>
      <p>${UI_TEXT.desktopBody}</p>
      <canvas id="qr" width="220" height="220"></canvas>
      <p class="fineprint" id="desktop-url"></p>
    </section>
  </main>`;
}
