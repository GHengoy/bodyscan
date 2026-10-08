// 빌드 시 vite.config.ts의 swPrecache 플러그인이 자리표시자(빌드 ID, MediaPipe 버전, 해시 자산 목록)를 치환해 dist/sw.js 로 내보낸다.
// - 앱 셸 + 해시 자산만 설치 시 프리캐시(빌드별 캐시, 새 빌드 활성화 시 이전 것 삭제).
// - 모델(/models/)·WASM(/wasm/)은 최초 측정 때 cache-first로 받아 MediaPipe 버전별 별도 캐시에 보관
//   (앱을 다시 배포해도 수 MB를 다시 내려받지 않는다). 이후 오프라인 동작.
// - 네비게이션(HTML)은 network-first → 새 배포가 즉시 반영된다.
const CACHE = 'bodyscan-__BUILD_ID__';
const MP_CACHE = 'bodyscan-mp-__MP_VERSION__';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/products.json',
].concat(__BUILD_ASSETS__);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith('bodyscan-') && k !== CACHE && k !== MP_CACHE)
          .map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

function putSafe(event, cacheName, req, res) {
  const copy = res.clone();
  event.waitUntil(caches.open(cacheName).then((c) => c.put(req, copy)).catch(() => {}));
}

/** SPA 폴백으로 HTML이 대신 내려온 응답은 자산 자리에 캐시하지 않는다 */
const isHtml = (res) => (res.headers.get('content-type') || '').startsWith('text/html');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate' || url.pathname === '/index.html';
  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) putSafe(event, CACHE, req, res); return res; })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/index.html'))),
    );
    return;
  }

  const isMediaPipe = url.pathname.startsWith('/models/') || url.pathname.startsWith('/wasm/');
  const cacheName = isMediaPipe ? MP_CACHE : CACHE;
  event.respondWith(
    caches.open(cacheName)
      .then((c) => c.match(req))
      .then((hit) => hit || caches.match(req))
      .then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res.ok && !isHtml(res)) putSafe(event, cacheName, req, res);
          return res;
        });
      }),
  );
});
