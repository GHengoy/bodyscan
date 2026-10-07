// 빌드 시 vite.config.ts의 swPrecache 플러그인이 아래 두 자리표시자(빌드 ID, 해시 자산 목록)를 치환해 dist/sw.js 로 내보낸다.
// 앱 셸 + 해시 자산 + 모델 + WASM을 프리캐시해 두 번째 방문부터 오프라인으로 동작한다.
// 네비게이션(HTML)은 network-first → 새 배포가 즉시 반영되고, 그 외 같은 출처 GET은 cache-first.
const CACHE = 'bodyscan-__BUILD_ID__';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/products.json',
  '/models/pose_landmarker_lite.task',
  '/wasm/vision_wasm_internal.js',
  '/wasm/vision_wasm_internal.wasm',
  '/wasm/vision_wasm_nosimd_internal.js',
  '/wasm/vision_wasm_nosimd_internal.wasm',
  '/wasm/vision_wasm_module_internal.js',
  '/wasm/vision_wasm_module_internal.wasm',
].concat(__BUILD_ASSETS__);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function putSafe(event, req, res) {
  const copy = res.clone();
  event.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate' || url.pathname === '/index.html';
  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) putSafe(event, req, res); return res; })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/index.html'))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => { if (res.ok) putSafe(event, req, res); return res; });
    }),
  );
});
