import './style.css';
import { UI_TEXT } from './copy';
import { openCamera, closeCamera, CameraError, type Facing } from './camera';
import { createDetector, type PoseDetector } from './pose/detector';
import { fullBodyVisible, isFacingFront, isFacingSide, HoldTimer } from './pose/gating';
import { CaptureStage } from './pose/capture';
import type { Pose } from './pose/landmarks';
import { analyzeFront } from './analysis/front';
import { analyzeSide } from './analysis/side';
import { analyzeProportion } from './analysis/proportion';
import { gradePosture, pickHeadline } from './analysis/grade';
import { recommendStyle } from './analysis/style';
import { startScreen, cameraScreen, errorScreen, desktopScreen } from './ui/screens';
import { createPrivacyIndicator, type PrivacyIndicator } from './ui/privacy';
import { drawSkeleton, drawGuide, drawProgressRing } from './ui/overlay';
import { mountBanner, unmountBanners, setAdsAllowed, isAdsAllowed, AD_SLOTS } from './ads/banner';
import { loadProducts, type Product } from './ads/products';
import { renderQr } from './ui/qr';
import { speak, setVoiceEnabled, isVoiceEnabled } from './speech';
import { renderResult, type ResultData } from './ui/result';
import { renderShareCard } from './ui/shareCard';
import { enableAnalytics, track } from './analytics';

type Phase = 'setup' | 'front' | 'side';

const app = document.querySelector<HTMLDivElement>('#app')!;
const $ = <T extends HTMLElement>(sel: string) => app.querySelector<T>(sel)!;

let detector: PoseDetector | null = null;
/** 모델 로딩은 한 번만(동시 호출도 같은 Promise). 실패하면 다음 시도에서 다시 만든다. */
let detectorP: Promise<PoseDetector> | null = null;
let products: Product[] = [];
let capturing = false;
let resumeOnVisible = false;
let rafId = 0;
let runId = 0;
let activeVideo: HTMLVideoElement | null = null;
let privacy: PrivacyIndicator | null = null;

const setText = (el: HTMLElement, t: string) => {
  if (el.textContent !== t) el.textContent = t;
};

const SETUP_TIMEOUT_MS = 30_000;

const params = new URLSearchParams(location.search);
/** 측정은 광고 스크립트가 전혀 로드되지 않는 별도 문서(/?capture=1)에서 실행한다 */
const CAPTURE_MODE = params.get('capture') === '1';

function isMobile(): boolean {
  if (params.get('desktop') === '1') return true;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
}

/** 이번 문서의 카메라 방향. URL 파라미터로만 기억한다(저장소 사용 금지). */
const FACING: Facing = params.get('cam') === 'back' ? 'environment' : 'user';

/** 측정 문서 URL. 개발용 desktop=1 오버라이드와 카메라 방향은 유지한다. */
function captureUrl(facing: Facing = FACING): string {
  const q = new URLSearchParams({ capture: '1' });
  if (params.get('desktop') === '1') q.set('desktop', '1');
  if (facing === 'environment') q.set('cam', 'back');
  return `${import.meta.env.BASE_URL}?${q.toString()}`;
}

// ---------- 화면 ----------

function showStart(): void {
  setAdsAllowed(true); // 시작 화면 문서에서는 카메라를 켜지 않는다
  enableAnalytics();
  app.innerHTML = startScreen();
  mountBanner($('[data-slot="start"]'), AD_SLOTS.start);
  $('#start-btn').onclick = (e) => {
    (e.currentTarget as HTMLButtonElement).disabled = true;
    location.assign(captureUrl());
  };
  preloadProducts(); // HTTP 캐시를 데워 둔다(측정 문서에서 다시 읽음)
}

/** 결과 화면에서 네트워크 요청이 생기지 않도록 미리 읽어 둔다 */
function preloadProducts(): void {
  if (products.length === 0) void loadProducts().then((p) => (products = p));
}

async function showDesktop(): Promise<void> {
  app.innerHTML = desktopScreen();
  const url = location.origin + import.meta.env.BASE_URL;
  $('#desktop-url').textContent = url;
  await renderQr($('#qr'), url);
}

function showError(title: string, body: string, onRetry: () => void): void {
  app.innerHTML = errorScreen(title, body, UI_TEXT.retry);
  $('#retry-btn').onclick = onRetry;
}

// ---------- 측정 ----------

function getDetector(): Promise<PoseDetector> {
  // 개발 모드 E2E 테스트용: scripts/e2e-flow.mjs 가 합성 포즈를 내는 가짜 검출기를 주입한다. 프로덕션 번들에서는 제거됨.
  if (import.meta.env.DEV) {
    const fake = (window as unknown as { __bodyscanFakeDetector?: PoseDetector }).__bodyscanFakeDetector;
    if (fake) return (detectorP ??= Promise.resolve(fake));
  }
  return (detectorP ??= createDetector().catch((e: unknown) => {
    detectorP = null;
    throw e;
  }));
}

function stopCapture(): void {
  runId++;
  capturing = false;
  cancelAnimationFrame(rafId);
  privacy?.stop();
  privacy = null;
  if (activeVideo) closeCamera(activeVideo);
  activeVideo = null;
}

async function runCapture(): Promise<void> {
  if (isAdsAllowed()) {
    // 광고 스크립트가 이미 로드된 문서에서는 카메라를 다시 열지 않는다 → 새 문서로
    location.assign(captureUrl());
    return;
  }
  const myRun = ++runId;
  unmountBanners();
  app.innerHTML = cameraScreen();
  const video = $<HTMLVideoElement>('#video');
  activeVideo = video;
  const canvas = $<HTMLCanvasElement>('#overlay');
  const statusEl = $('#status');
  const countdownEl = $('#countdown');
  const screen = $('.screen.camera');

  const skelToggle = $<HTMLInputElement>('#toggle-skeleton');
  skelToggle.onchange = () => screen.classList.toggle('skeleton-only', skelToggle.checked);
  const voiceToggle = $<HTMLInputElement>('#toggle-voice');
  voiceToggle.checked = isVoiceEnabled();
  voiceToggle.onchange = () => setVoiceEnabled(voiceToggle.checked);

  // 전/후면 전환은 새 측정 문서로 이동(카메라·단계 상태를 깨끗이 다시 시작)
  const mirrored = FACING === 'user';
  $('.cam-stage').classList.toggle('no-mirror', !mirrored);
  const camToggle = $<HTMLButtonElement>('#toggle-camera');
  camToggle.textContent = mirrored ? UI_TEXT.switchToBack : UI_TEXT.switchToFront;
  camToggle.onclick = () => {
    stopCapture();
    location.assign(captureUrl(mirrored ? 'environment' : 'user'));
  };
  if (!mirrored) {
    const tip = document.createElement('div');
    tip.className = 'cam-tip';
    tip.textContent = UI_TEXT.backCameraTip;
    $('.cam-wrap').appendChild(tip);
  }

  const privacyEl = $('#privacy');
  statusEl.textContent = UI_TEXT.cameraStarting;
  privacyEl.textContent = UI_TEXT.cameraStarting;
  try {
    await openCamera(video, FACING);
  } catch (e) {
    const denied = e instanceof CameraError && e.code === 'denied';
    if (myRun !== runId) return;
    activeVideo = null; // 에러 화면에서는 탭 복귀 시 카메라가 자동으로 켜지지 않도록
    showError(
      denied ? UI_TEXT.cameraDenied : UI_TEXT.cameraUnavailable,
      denied ? UI_TEXT.cameraDeniedBody : UI_TEXT.cameraUnavailableBody,
      () => void runCapture(),
    );
    return;
  }
  if (myRun !== runId) {
    closeCamera(video);
    return;
  }

  statusEl.textContent = UI_TEXT.loadingModel;
  privacyEl.textContent = UI_TEXT.loadingModel;
  let det: PoseDetector;
  try {
    det = await getDetector();
    detector = det;
  } catch {
    if (myRun !== runId) {
      closeCamera(video);
      return;
    }
    stopCapture();
    showError(UI_TEXT.modelFailed, UI_TEXT.modelFailedBody, () => void runCapture());
    return;
  }

  if (myRun !== runId) {
    closeCamera(video);
    return;
  }

  // 모델 로딩이 끝난 뒤부터 네트워크 요청을 센다
  privacy = createPrivacyIndicator(privacyEl);
  privacy.start();
  capturing = true;

  const aspect = () => video.videoWidth / video.videoHeight;
  const setupHold = new HoldTimer(1500);
  const frontStage = new CaptureStage((p) => isFacingFront(p, aspect()));
  const sideStage = new CaptureStage((p) => isFacingSide(p, aspect()));
  let phase: Phase = 'setup';
  let frontPose: Pose | null = null;
  const startedAt = performance.now();
  let lastSpoken = '';
  let lastCountdown = 0;
  const say = (t: string) => {
    if (t === lastSpoken) return;
    lastSpoken = t;
    speak(t);
  };
  say(UI_TEXT.setupHint);

  const ctx = canvas.getContext('2d')!;
  const loop = () => {
    if (!capturing) return;
    try {
      const now = performance.now();
      const w = video.videoWidth, h = video.videoHeight;
      if (w && h && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      const pose = det.detect(video, now);

      if (phase === 'setup') {
        const ok = !!pose && fullBodyVisible(pose);
        drawGuide(ctx, w, h, ok);
        if (pose) drawSkeleton(ctx, pose, w, h, { color: ok ? '#4ade80' : '#f8fafc' });
        const held = setupHold.update(ok, now);
        drawProgressRing(ctx, w, h, setupHold.progress(now));
        setText(statusEl, ok
          ? UI_TEXT.setupOk
          : now - startedAt > SETUP_TIMEOUT_MS ? UI_TEXT.setupTimeout : UI_TEXT.setupHint);
        if (held) {
          phase = 'front';
          say(UI_TEXT.frontHint);
        }
      } else {
        const stage = phase === 'front' ? frontStage : sideStage;
        const hint = phase === 'front' ? UI_TEXT.frontHint : UI_TEXT.sideHint;
        const measuring = phase === 'front' ? UI_TEXT.frontMeasuring : UI_TEXT.sideMeasuring;
        const st = stage.update(pose, now);
        if (pose) drawSkeleton(ctx, pose, w, h, { color: st.ok ? '#4ade80' : '#fbbf24' });
        setText(countdownEl, st.step === 'countdown' ? String(st.countdown) : '');

        if (st.step === 'align') {
          setText(statusEl, st.ok ? UI_TEXT.setupOk : hint);
          drawProgressRing(ctx, w, h, st.holdProgress);
          lastCountdown = 0;
        } else if (st.step === 'countdown') {
          setText(statusEl, UI_TEXT.setupOk);
          if (st.countdown !== lastCountdown) {
            lastCountdown = st.countdown;
            speak(String(st.countdown));
          }
        } else {
          setText(statusEl, measuring);
          drawProgressRing(ctx, w, h, st.sampleProgress);
        }

        if (st.done) {
          if (phase === 'front') {
            frontPose = st.done;
            phase = 'side';
            say(UI_TEXT.sideHint);
          } else {
            finish(frontPose!, st.done, aspect());
            return;
          }
        }
      }
      rafId = requestAnimationFrame(loop);
    } catch (err) {
      console.error('[loop]', err);
      // 손상된 엔진일 수 있으니 버리고, 다시 시도 시 새로 만든다
      try { detector?.close(); } catch { /* 무시 */ }
      detectorP = null;
      detector = null;
      stopCapture();
      showError(UI_TEXT.detectFailed, UI_TEXT.detectFailedBody, () => void runCapture());
    }
  };
  rafId = requestAnimationFrame(loop);
}

function finish(frontPose: Pose, sidePose: Pose, aspect: number): void {
  stopCapture();
  speak(UI_TEXT.measureDone);
  const front = analyzeFront(frontPose, aspect);
  const side = analyzeSide(sidePose, aspect);
  const proportion = analyzeProportion(frontPose, aspect);
  const items = gradePosture(front, side);
  const data: ResultData = {
    front, side, proportion, items,
    headline: pickHeadline(items),
    style: recommendStyle(proportion),
    frontPose, sidePose, aspect,
    mirrored: FACING === 'user',
  };
  renderResult(app, data, {
    products,
    onRetry: () => location.assign(captureUrl()),
    onShare: (r) => track('share', { method: r }),
    onProductClick: (category) => track('product_click', { category }),
  });
  window.scrollTo(0, 0);
  if (import.meta.env.DEV) {
    // E2E가 공유 카드 PNG를 뽑아 볼 수 있게 노출(프로덕션 번들에서는 제거됨)
    (window as unknown as { __bodyscanRenderShareCard?: () => HTMLCanvasElement }).__bodyscanRenderShareCard = () => renderShareCard(data);
  }
  // 카메라가 꺼졌고 렌더까지 끝난 뒤에만 허용 — 도중에 예외가 나면 광고는 꺼진 채로 문서 내 재시도 가능
  setAdsAllowed(true);
  enableAnalytics(); // 광고와 같은 규칙: 카메라가 끝난 뒤에만
  track('measure_complete', { headline: data.headline.id, variant: data.headline.variant });
  // 허용 이후 결과 화면의 광고 슬롯을 실제 광고로 다시 마운트
  for (const el of app.querySelectorAll<HTMLElement>('.ad-slot')) {
    const s = el.dataset.slot ?? '';
    mountBanner(el, s === 'result1' ? AD_SLOTS.result1 : s === 'result2' ? AD_SLOTS.result2 : AD_SLOTS.native);
  }
}

// ---------- 생명주기 ----------

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (capturing || activeVideo) {
      stopCapture();
      resumeOnVisible = true;
    }
  } else if (resumeOnVisible) {
    resumeOnVisible = false;
    void runCapture();
  }
});
window.addEventListener('pagehide', stopCapture);
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    const b = document.querySelector<HTMLButtonElement>('#start-btn');
    if (b) b.disabled = false;
  }
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`));
}

if (!isMobile()) void showDesktop();
else if (CAPTURE_MODE) {
  preloadProducts();
  void runCapture();
}
else showStart();
