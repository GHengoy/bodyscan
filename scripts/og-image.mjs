// 소셜 공유 미리보기 이미지(public/og.png, 1200×630)를 로컬 크롬으로 렌더링한다. 실행: npm run og
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chromePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean).find((p) => existsSync(p));
if (!chromePath) throw new Error('Chrome not found; set CHROME_PATH');

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
  body{margin:0;width:1200px;height:630px;background:#0f1115;color:#f3f4f6;font-family:-apple-system,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif;overflow:hidden}
  .wrap{position:relative;width:1200px;height:630px;padding:64px 72px;box-sizing:border-box}
  .brand{color:#4ade80;font-weight:800;font-size:34px;letter-spacing:-.01em}
  h1{font-size:72px;line-height:1.15;margin:28px 0 18px;font-weight:900;letter-spacing:-.02em;width:760px}
  p{font-size:30px;color:#9aa3b2;margin:0;width:720px;line-height:1.45}
  .chips{position:absolute;left:72px;bottom:64px;display:flex;gap:14px}
  .chip{background:#181b22;border:1px solid #2a2f3a;border-radius:999px;padding:12px 22px;font-size:24px}
  .chip.g{color:#4ade80;border-color:#1f5131;background:#0e2a19}
  .card{position:absolute;right:72px;top:70px;width:300px;height:490px;background:#181b22;border-radius:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
  .card .emoji{font-size:120px}
  .card .t{font-size:30px;font-weight:800}
  .card .s{font-size:20px;color:#9aa3b2}
  .card .bar{width:220px;height:10px;border-radius:5px;background:#2a2f3a;margin-top:10px;overflow:hidden}
  .card .bar i{display:block;height:100%;width:62%;background:#4ade80}
</style></head><body><div class="wrap">
  <div class="brand">BodyScan</div>
  <h1>30초 체형·자세 테스트<br>당신은 거북이? 🐢<br>운동선수? 🏅</h1>
  <p>카메라 앞에 서기만 하면 거북목·라운드숄더·골반 기울기·체형 비율 분석 + 어울리는 옷 추천</p>
  <div class="chips"><div class="chip g">🔒 영상 저장·전송 없음</div><div class="chip">📱 설치 없이 폰 브라우저</div><div class="chip">무료</div></div>
  <div class="card"><div class="emoji">🐢</div><div class="t">당신은 거북이시군요</div><div class="s">거북목 18° · 라운드숄더 9%</div><div class="bar"><i></i></div></div>
</div></body></html>`;

const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
const out = join(root, 'public', 'og.png');
await page.screenshot({ path: out, type: 'png' });
await browser.close();
console.log(`[og] wrote ${out}`);
