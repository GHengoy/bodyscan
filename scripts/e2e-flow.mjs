// 카메라·사람 없이 전체 측정 플로우를 끝까지 돌리는 E2E 테스트.
// - Chrome의 가짜 카메라 장치(--use-fake-device-for-media-stream)로 getUserMedia를 통과시키고
// - 개발 모드 전용 훅(window.__bodyscanFakeDetector)에 합성 포즈를 내는 가짜 검출기를 주입한다.
// 실행: npm run e2e  (vite dev 서버를 직접 띄우고 끝나면 내린다)
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 5174;
const OUT = join(root, '.e2e');
mkdirSync(OUT, { recursive: true });

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);
const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chromePath) throw new Error('Chrome not found; set CHROME_PATH');

// ---------- 브라우저에 주입되는 가짜 검출기 (tests/helpers.ts 의 픽스처와 동일한 기하) ----------
const FAKE_DETECTOR_SRC = `
(() => {
  const LM = { NOSE:0, LEFT_EYE:2, RIGHT_EYE:5, LEFT_EAR:7, RIGHT_EAR:8, LEFT_SHOULDER:11, RIGHT_SHOULDER:12,
    LEFT_ELBOW:13, RIGHT_ELBOW:14, LEFT_WRIST:15, RIGHT_WRIST:16, LEFT_HIP:23, RIGHT_HIP:24, LEFT_KNEE:25, RIGHT_KNEE:26,
    LEFT_ANKLE:27, RIGHT_ANKLE:28, LEFT_HEEL:29, RIGHT_HEEL:30, LEFT_FOOT_INDEX:31, RIGHT_FOOT_INDEX:32 };
  const makePose = (o) => { const pose = Array.from({length:33}, () => ({x:0.5,y:0.5,z:0,visibility:0.9}));
    for (const [i,p] of Object.entries(o)) pose[Number(i)] = { x:0.5,y:0.5,z:0,visibility:0.9, ...p }; return pose; };
  function standingFront() {
    const cx = 0.5, o = { [LM.NOSE]: { x: cx, y: 0.15 } };
    const sym = (l, r, dx, y) => { o[l] = { x: cx + dx, y }; o[r] = { x: cx - dx, y }; };
    sym(LM.LEFT_EYE, LM.RIGHT_EYE, 0.02, 0.14); sym(LM.LEFT_EAR, LM.RIGHT_EAR, 0.04, 0.15);
    sym(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, 0.12, 0.3); sym(LM.LEFT_ELBOW, LM.RIGHT_ELBOW, 0.14, 0.42);
    sym(LM.LEFT_WRIST, LM.RIGHT_WRIST, 0.15, 0.53); sym(LM.LEFT_HIP, LM.RIGHT_HIP, 0.11, 0.52);
    sym(LM.LEFT_KNEE, LM.RIGHT_KNEE, 0.08, 0.71); sym(LM.LEFT_ANKLE, LM.RIGHT_ANKLE, 0.07, 0.9);
    sym(LM.LEFT_HEEL, LM.RIGHT_HEEL, 0.07, 0.93); sym(LM.LEFT_FOOT_INDEX, LM.RIGHT_FOOT_INDEX, 0.08, 0.95);
    return makePose(o);
  }
  function standingSide() { // 왼쪽으로 돈 사람: 오른쪽 몸이 카메라를 향함(+x를 바라봄)
    const cx = 0.5, f = 1, o = { [LM.NOSE]: { x: cx + 0.04 * f, y: 0.16 } };
    const pair = (l, r, x, y) => { o[l] = { x, y, visibility: 0.3 }; o[r] = { x, y, visibility: 0.9 }; };
    pair(LM.LEFT_EYE, LM.RIGHT_EYE, cx + 0.02 * f, 0.14); pair(LM.LEFT_EAR, LM.RIGHT_EAR, cx + 0.015, 0.15); // 살짝 거북목
    pair(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, cx, 0.3); pair(LM.LEFT_ELBOW, LM.RIGHT_ELBOW, cx, 0.42);
    pair(LM.LEFT_WRIST, LM.RIGHT_WRIST, cx + 0.02 * f, 0.53); pair(LM.LEFT_HIP, LM.RIGHT_HIP, cx, 0.52);
    pair(LM.LEFT_KNEE, LM.RIGHT_KNEE, cx, 0.71); pair(LM.LEFT_ANKLE, LM.RIGHT_ANKLE, cx, 0.9);
    pair(LM.LEFT_HEEL, LM.RIGHT_HEEL, cx - 0.03 * f, 0.93); pair(LM.LEFT_FOOT_INDEX, LM.RIGHT_FOOT_INDEX, cx + 0.06 * f, 0.95);
    return makePose(o);
  }
  const jitter = (pose) => pose.map((p) => ({ ...p, x: p.x + (Math.random() - 0.5) * 0.004, y: p.y + (Math.random() - 0.5) * 0.004 }));
  window.__e2e = { frames: 0, phase: 'front' };
  window.__bodyscanFakeDetector = {
    detect() {
      window.__e2e.frames++;
      const status = document.querySelector('#status')?.textContent ?? '';
      if (status.includes('옆모습')) window.__e2e.phase = 'side';
      return jitter(window.__e2e.phase === 'side' ? standingSide() : standingFront());
    },
    close() {},
  };
})();
`;

// ---------- dev 서버 ----------
function startDevServer() {
  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32',
  });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('vite did not start')), 60_000);
    // vite 출력에는 ANSI 색상 코드가 섞여 있어 포트 문자열로 준비 여부를 판단한다
    const strip = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');
    child.stdout.on('data', (d) => { if (strip(d).includes(`localhost:${PORT}`)) { clearTimeout(t); resolve(child); } });
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('exit', (c) => reject(new Error(`vite exited ${c}`)));
  });
}

const waitFor = async (page, pred, timeout, label) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate(pred)) return;
    await new Promise((r) => setTimeout(r, 150));
  }
  const diag = await page.evaluate(() => JSON.stringify({
    status: document.querySelector('#status')?.textContent,
    countdown: document.querySelector('#countdown')?.textContent,
    e2e: window.__e2e,
    screen: document.querySelector('.screen')?.className,
  }));
  throw new Error(`timeout waiting for ${label}; state=${diag}`);
};

const server = await startDevServer();
let failed = false;
try {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.evaluateOnNewDocument(FAKE_DETECTOR_SRC);

  const log = (s) => console.log(`[e2e] ${s}`);

  // 1. 시작 화면 → 측정 문서로 이동
  await page.goto(`http://localhost:${PORT}/?desktop=1`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#start-btn');
  await page.screenshot({ path: join(OUT, '01-start.png') });
  await Promise.all([page.waitForNavigation(), page.click('#start-btn')]);
  if (!page.url().includes('capture=1')) throw new Error(`expected capture document, got ${page.url()}`);
  log(`capture document: ${page.url()}`);

  // 2. 카메라 열림 → 가짜 검출기 → 전신 인식 → 정면 측정
  await waitFor(page, () => !!document.querySelector('#video')?.srcObject, 15_000, 'camera stream');
  log('camera stream attached (fake device)');
  await waitFor(page, () => (document.querySelector('#privacy')?.textContent ?? '').includes('0건'), 15_000, 'privacy indicator');
  log('privacy indicator: ' + await page.$eval('#privacy', (e) => e.textContent));
  await waitFor(page, () => (document.querySelector('#status')?.textContent ?? '').includes('정면 측정 중'), 20_000, 'front sampling');
  await page.screenshot({ path: join(OUT, '02-front-sampling.png') });
  log('front sampling…');

  // 3. 측면 안내 → 측면 측정 → 결과
  // 가짜 검출기는 측면 안내 문구를 보면 스스로 측면 포즈로 바뀐다(폴링이 놓칠 수 있으니 결과 화면을 기준으로 기다린다)
  await waitFor(page, () => !!document.querySelector('.screen.result'), 40_000, 'result screen');
  const phase = await page.evaluate(() => window.__e2e.phase);
  if (phase !== 'side') throw new Error('side phase never reached');
  log('front → side → result reached');

  // 4. 결과 화면 검증
  const result = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      headline: document.querySelector('.headline h1')?.textContent,
      items: document.querySelectorAll('.item').length,
      badges: [...document.querySelectorAll('.badge')].map((b) => b.className.replace('badge ', '')),
      placeholders: (text.match(/\{\w+\}/g) ?? []).length,
      cameraOff: text.includes('카메라가 꺼졌습니다'),
      videoStream: !!document.querySelector('#video')?.srcObject,
      shareBtn: document.querySelector('#share-btn')?.textContent,
      retryBtn: !!document.querySelector('#retry-btn'),
      products: document.querySelectorAll('.product').length,
      adSlots: document.querySelectorAll('.ad-slot').length,
      diagrams: document.querySelectorAll('.diagrams canvas').length,
      frames: window.__e2e.frames,
    };
  });
  await page.screenshot({ path: join(OUT, '04-result.png'), fullPage: true });
  log('result: ' + JSON.stringify(result));

  const checks = [
    [result.items === 9, '9 posture items'],
    [result.placeholders === 0, 'no leftover {placeholders}'],
    [result.cameraOff, 'camera-off banner'],
    [!result.videoStream, 'video stream released'],
    [!!result.headline, 'headline present'],
    [!!result.retryBtn, 'retry button'],
    [result.diagrams === 2, 'two skeleton diagrams'],
    [result.adSlots >= 2, 'ad slots on result (placeholders without env)'],
    [consoleErrors.length === 0, 'no console errors: ' + consoleErrors.join(' | ')],
  ];
  for (const [ok, label] of checks) {
    console.log(`  ${ok ? '✓' : '✗'} ${label}`);
    if (!ok) failed = true;
  }

  // 공유 시트는 헤드리스 크롬에서 불가 → 버튼 상태만 기록하고, 카드 PNG는 dev 훅으로 직접 뽑아 저장
  log('share button: ' + JSON.stringify(result.shareBtn));
  const card = await page.evaluate(() => {
    const c = window.__bodyscanRenderShareCard?.();
    return c ? { w: c.width, h: c.height, png: c.toDataURL('image/png') } : null;
  });
  if (!card) { console.log('  ✗ share card hook missing'); failed = true; }
  else {
    writeFileSync(join(OUT, '05-share-card.png'), Buffer.from(card.png.split(',')[1], 'base64'));
    console.log(`  ✓ share card rendered ${card.w}x${card.h} → .e2e/05-share-card.png`);
  }

  await browser.close();
} catch (e) {
  failed = true;
  console.error('[e2e] FAILED:', e);
} finally {
  // Windows에서는 shell(cmd) 아래의 node 트리까지 함께 내려야 포트가 남지 않는다
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else server.kill();
}
process.exit(failed ? 1 : 0);
