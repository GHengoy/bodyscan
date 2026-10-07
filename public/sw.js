// 앱 셸 + 모델 + WASM을 캐시해 두 번째 방문부터 오프라인으로 동작한다.
// 네트워크 요청은 같은 출처 GET만 다루며, 캐시 우선 → 없으면 네트워크 후 캐시.
const CACHE = 'bodyscan-v1';
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
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    }),
  );
});
