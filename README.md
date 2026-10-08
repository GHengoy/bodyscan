# BodyScan

모바일 전면 카메라로 전신을 **기기 안에서만** 실시간 분석해 자세·체형 비율을 비유 캐릭터로 알려주고 옷 스타일을 추천하는 정적 웹사이트.

- 서버 코드 0줄. 영상·사진은 저장되지 않고 기기 밖으로 나가지 않습니다.
- 결과는 화면에서만 보고, 기기 "공유하기"로 결과 카드(수치만 담긴 PNG)만 내보낼 수 있습니다.
- 수익화: Google AdSense 배너(시작·결과 화면만) + 체형별 제휴 상품 슬롯.

## 개발

```bash
npm install
npm run dev        # 모델/WASM 자동 다운로드 후 https 없이 localhost에서 실행
npm test           # Vitest 단위 테스트
npm run build      # dist/ 생성
```

- 서비스 워커 소스는 `src/sw.template.js`이며 빌드 시 `dist/sw.js`로 내보내집니다.
- 데스크톱 크롬에서 테스트: `http://localhost:5173/?desktop=1`
- 같은 Wi-Fi의 폰에서 테스트: 카메라는 HTTPS 필수 → `npx vite --host`는 http라 폰에서 카메라가 열리지 않습니다. `npx localtunnel --port 5173` 또는 `cloudflared tunnel --url http://localhost:5173`로 https 주소를 만들어 접속하세요.

## 환경 변수 (`.env`)

`.env.example` 참고. `VITE_ADSENSE_CLIENT`가 비어 있으면 광고 자리에 플레이스홀더만 표시됩니다.

## 제휴 상품

`public/products.json` 배열을 편집합니다.

| 필드 | 설명 |
|---|---|
| `bodyType` | `inverted` / `balanced` / `triangle` - `longTorso` / `balanced` / `longLegs` 조합(예: `inverted-longLegs`) 또는 `any` |
| `category` | `top` / `bottom` / `outer` |
| `image`, `name`, `price`, `url` | 표시 정보와 제휴 링크 |

해당 체형·카테고리 상품이 없으면 `any`, 그래도 없으면 네이티브 광고 유닛(`VITE_ADSENSE_SLOT_NATIVE`)으로 폴백합니다.

## 배포

정적 산출물(`dist/`)을 Vercel / Netlify / Cloudflare Pages에 올리면 끝. 빌드 명령 `npm run build`, 출력 `dist`. HTTPS는 자동. 빌드마다 `sw.js`에 새 캐시 이름과 해시 자산 목록이 자동으로 들어가므로 배포 후 사용자는 다음 방문(온라인)에서 새 버전을 받습니다. 수동으로 캐시 이름을 올릴 필요 없습니다.

## 프라이버시 구조

- 영상 프레임을 전송하는 코드 경로가 없습니다 (`src/`에서 `fetch`는 `ads/products.ts`의 상품 목록 로드 1곳만).
- 측정 중 상단 인디케이터가 `PerformanceObserver`로 네트워크 요청 수를 세어 0건임을 보여줍니다.
- 측정은 광고 스크립트가 전혀 로드되지 않는 별도 문서(`/?capture=1`)에서 실행됩니다. 광고 스크립트는 카메라가 종료된 뒤(결과 화면) 또는 시작 화면 문서에서만 로드되고, "다시 측정"은 새 문서로 이동하므로 광고가 로드된 문서에서 카메라가 다시 켜지지 않습니다.
- 권장: 호스팅에서 CSP와 `Permissions-Policy: camera=(self)` 헤더를 추가하세요.
- 측정 완료·탭 이탈 시 즉시 `MediaStreamTrack.stop()`. 결과는 메모리에만 있고 새로고침하면 사라집니다.
- 공유 카드는 수치·도식만 그립니다(`ui/shareCard.ts`에서 비디오 `drawImage` 금지).

## 폰 수동 테스트 체크리스트

- [ ] iOS Safari / Android Chrome에서 전체 플로우(시작 → 전신 인식 → 정면 → 측면 → 결과)
- [ ] 측정 중 인디케이터 "네트워크 전송 0건" 유지
- [ ] 측정 끝나면 카메라 표시등(상단 녹색/주황 점) 꺼짐
- [ ] 결과 화면 공유 버튼 → OS 공유 시트에 PNG 카드
- [ ] 새로고침 후 결과 사라짐
- [ ] 두 번째 방문: 비행기 모드에서 사이트 열어 측정 가능(PWA 캐시)
- [ ] 측정 중 홈 화면으로 나갔다 돌아오면 카메라 준비 단계부터 재시작
