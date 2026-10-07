import './style.css';
import { UI_TEXT } from './copy';
import { openCamera, closeCamera, CameraError } from './camera';
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
import { mountBanner, unmountBanners, AD_SLOTS } from './ads/banner';
import { loadProducts, type Product } from './ads/products';
import { renderQr } from './ui/qr';
import { speak, setVoiceEnabled, isVoiceEnabled } from './speech';
import { renderResult, type ResultData } from './ui/result';

type Phase = 'setup' | 'front' | 'side';

const app = document.querySelector<HTMLDivElement>('#app')!;
const $ = <T extends HTMLElement>(sel: string) => app.querySelector<T>(sel)!;

let detector: PoseDetector | null = null;
let products: Product[] = [];
let capturing = false;
let resumeOnVisible = false;
let rafId = 0;
let activeVideo: HTMLVideoElement | null = null;
let privacy: PrivacyIndicator | null = null;

const SETUP_TIMEOUT_MS = 30_000;

function isMobile(): boolean {
  if (new URLSearchParams(location.search).get('desktop') === '1') return true;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
}

// ---------- 화면 ----------

function showStart(): void {
  app.innerHTML = startScreen();
  mountBanner($('[data-slot="start"]'), AD_SLOTS.start);
  $('#start-btn').onclick = () => void runCapture();
  if (products.length === 0) void loadProducts().then((p) => (products = p));
}

async function showDesktop(): Promise<void> {
  app.innerHTML = desktopScreen();
  $('#desktop-url').textContent = location.href;
  await renderQr($('#qr'), location.href);
}

function showError(title: string, body: string, onRetry: () => void): void {
  app.innerHTML = errorScreen(title, body, UI_TEXT.retry);
  $('#retry-btn').onclick = onRetry;
}

// ---------- 측정 ----------

function stopCapture(): void {
  capturing = false;
  cancelAnimationFrame(rafId);
  privacy?.stop();
  privacy = null;
  if (activeVideo) closeCamera(activeVideo);
  activeVideo = null;
}

async function runCapture(): Promise<void> {
  unmountBanners();
  app.innerHTML = cameraScreen();
  const video = $<HTMLVideoElement>('#video');
  const canvas = $<HTMLCanvasElement>('#overlay');
  const statusEl = $('#status');
  const countdownEl = $('#countdown');
  const screen = $('.screen.camera');

  const skelToggle = $<HTMLInputElement>('#toggle-skeleton');
  skelToggle.onchange = () => screen.classList.toggle('skeleton-only', skelToggle.checked);
  const voiceToggle = $<HTMLInputElement>('#toggle-voice');
  voiceToggle.checked = isVoiceEnabled();
  voiceToggle.onchange = () => setVoiceEnabled(voiceToggle.checked);

  try {
    await openCamera(video);
  } catch (e) {
    const denied = e instanceof CameraError && e.code === 'denied';
    showError(
      denied ? UI_TEXT.cameraDenied : UI_TEXT.modelFailed,
      denied ? UI_TEXT.cameraDeniedBody : '카메라를 사용할 수 없어요. 다른 앱이 카메라를 쓰고 있지 않은지 확인해 주세요.',
      () => void runCapture(),
    );
    return;
  }
  activeVideo = video;

  if (!detector) {
    statusEl.textContent = UI_TEXT.loadingModel;
    try {
      detector = await createDetector();
    } catch {
      stopCapture();
      showError(UI_TEXT.modelFailed, UI_TEXT.modelFailedBody, () => void runCapture());
      return;
    }
  }

  // 모델 로딩이 끝난 뒤부터 네트워크 요청을 센다
  privacy = createPrivacyIndicator($('#privacy'));
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

  const loop = () => {
    if (!capturing) return;
    const now = performance.now();
    const w = video.videoWidth, h = video.videoHeight;
    if (w && h && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    const pose = detector!.detect(video, now);

    if (phase === 'setup') {
      const ok = !!pose && fullBodyVisible(pose);
      drawGuide(ctx, w, h, ok);
      if (pose) drawSkeleton(ctx, pose, w, h, { color: ok ? '#4ade80' : '#f8fafc' });
      const held = setupHold.update(ok, now);
      drawProgressRing(ctx, w, h, setupHold.progress(now));
      statusEl.textContent = ok
        ? UI_TEXT.setupOk
        : now - startedAt > SETUP_TIMEOUT_MS ? UI_TEXT.setupTimeout : UI_TEXT.setupHint;
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
      countdownEl.textContent = st.step === 'countdown' ? String(st.countdown) : '';

      if (st.step === 'align') {
        statusEl.textContent = st.ok ? UI_TEXT.setupOk : hint;
        drawProgressRing(ctx, w, h, st.holdProgress);
        lastCountdown = 0;
      } else if (st.step === 'countdown') {
        statusEl.textContent = UI_TEXT.setupOk;
        if (st.countdown !== lastCountdown) {
          lastCountdown = st.countdown;
          speak(String(st.countdown));
        }
      } else {
        statusEl.textContent = measuring;
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
  };
  rafId = requestAnimationFrame(loop);
}

function finish(frontPose: Pose, sidePose: Pose, aspect: number): void {
  stopCapture();
  speak('측정이 끝났어요');
  const front = analyzeFront(frontPose, aspect);
  const side = analyzeSide(sidePose, aspect);
  const proportion = analyzeProportion(frontPose, aspect);
  const items = gradePosture(front, side);
  const data: ResultData = {
    front, side, proportion, items,
    headline: pickHeadline(items),
    style: recommendStyle(proportion),
    frontPose, sidePose, aspect,
  };
  renderResult(app, data, { products, onRetry: () => void runCapture() });
  window.scrollTo(0, 0);
}

// ---------- 생명주기 ----------

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (capturing) {
      stopCapture();
      resumeOnVisible = true;
    }
  } else if (resumeOnVisible) {
    resumeOnVisible = false;
    void runCapture();
  }
});
window.addEventListener('pagehide', stopCapture);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}

if (isMobile()) showStart();
else void showDesktop();
