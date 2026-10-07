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
let runId = 0;
let activeVideo: HTMLVideoElement | null = null;
let privacy: PrivacyIndicator | null = null;

const setText = (el: HTMLElement, t: string) => {
  if (el.textContent !== t) el.textContent = t;
};

const SETUP_TIMEOUT_MS = 30_000;

function isMobile(): boolean {
  if (new URLSearchParams(location.search).get('desktop') === '1') return true;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
}

// ---------- 화면 ----------

function showStart(): void {
  app.innerHTML = startScreen();
  mountBanner($('[data-slot="start"]'), AD_SLOTS.start);
  $('#start-btn').onclick = (e) => {
    (e.currentTarget as HTMLButtonElement).disabled = true;
    void runCapture();
  };
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
  runId++;
  capturing = false;
  cancelAnimationFrame(rafId);
  privacy?.stop();
  privacy = null;
  if (activeVideo) closeCamera(activeVideo);
  activeVideo = null;
}

async function runCapture(): Promise<void> {
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

  try {
    await openCamera(video);
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

  if (!detector) {
    statusEl.textContent = UI_TEXT.loadingModel;
    try {
      detector = await createDetector();
    } catch {
      if (myRun !== runId) {
        closeCamera(video);
        return;
      }
      stopCapture();
      showError(UI_TEXT.modelFailed, UI_TEXT.modelFailedBody, () => void runCapture());
      return;
    }
  }

  if (myRun !== runId) {
    closeCamera(video);
    return;
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
      const pose = detector!.detect(video, now);

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
  };
  renderResult(app, data, { products, onRetry: () => void runCapture() });
  window.scrollTo(0, 0);
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

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}

if (isMobile()) showStart();
else void showDesktop();
