import type { PostureItemId, Headline, GradedItem } from './analysis/grade';
import type { ShoulderHipType, TorsoLegType } from './analysis/proportion';
import type { BodyTypeKey } from './analysis/style';

export interface ItemCopy {
  title: string;
  good: string;
  warn: string;
  bad: string;
  tip: string;
}

export function fillTemplate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function sideLabel(variant: string): string {
  if (variant === 'left') return '왼쪽';
  if (variant === 'right') return '오른쪽';
  return '';
}

export const POSTURE_COPY: Record<PostureItemId, ItemCopy> = {
  shoulderTilt: {
    title: '어깨 높이',
    good: '자처럼 곧은 어깨선 📏 ({deg}°)',
    warn: '살짝 기울어진 시소 ⚖️ — {side} 어깨가 {deg}° 높아요',
    bad: '한쪽만 짐 든 택배기사 📦 — {side} 어깨가 {deg}° 높아요',
    tip: '가방을 한쪽으로만 메지 말고, 낮은 쪽 어깨를 귀 쪽으로 으쓱 올려 5초 버티기 × 10회',
  },
  hipTilt: {
    title: '골반 높이',
    good: '수평계처럼 평평한 골반 🧰 ({deg}°)',
    warn: '살짝 기울어진 골반 ⚖️ — {side}이 {deg}° 높아요',
    bad: '한 발로 서는 플라밍고 골반 🦩 — {side}이 {deg}° 높아요',
    tip: '짝다리 금지! 벽에 등을 대고 양발에 체중을 똑같이 나눠 서는 연습을 해 보세요',
  },
  headTilt: {
    title: '머리 기울기',
    good: '똑바로 세운 촛불 🕯️ ({deg}°)',
    warn: '갸웃하는 강아지 🐶 — {side}으로 {deg}° 기울었어요',
    bad: '궁금한 게 많은 강아지 🐶 — {side}으로 {deg}° 기울었어요',
    tip: '화면을 볼 때 머리를 갸웃하는 습관이 있는지 확인하고, 목을 반대쪽으로 천천히 늘려 주세요',
  },
  centerDeviation: {
    title: '몸 중심선',
    good: '일직선으로 선 기둥 🏛️ (편차 {pct}%)',
    warn: '살짝 흔들리는 갈대 🌾 (편차 {pct}%)',
    bad: '바람 맞은 갈대 🌾 (편차 {pct}%)',
    tip: '거울 앞에서 코–배꼽–양발 사이가 한 줄이 되는지 확인하며 서 보세요',
  },
  kneeAlign: {
    title: '다리 정렬',
    good: '나란히 선 젓가락 🥢 (무릎 편차 {pct}%)',
    warn: '{variantLabel}이 살짝 보여요 (무릎 편차 {pct}%)',
    bad: '{variantLabel} (무릎 편차 {pct}%)',
    tip: 'O자 경향이면 허벅지 안쪽, X자 경향이면 엉덩이 바깥 근육 강화 운동이 도움이 돼요',
  },
  forwardHead: {
    title: '거북목',
    good: '목이 곧은 기린 🦒 ({deg}°)',
    warn: '목을 살짝 내민 거북이 🐢 ({deg}°)',
    bad: '완전히 목을 내민 거북이 🐢 ({deg}°)',
    tip: '턱을 뒤로 당겨 뒷목을 길게 만드는 "턱 당기기" 10회 × 3세트, 모니터는 눈높이로',
  },
  roundShoulder: {
    title: '라운드숄더',
    good: '쫙 펴진 어깨, 슈퍼히어로 🦸 ({pct}%)',
    warn: '살짝 말린 어깨, 졸린 고양이 🐱 ({pct}%)',
    bad: '등이 둥근 고양이 🐱 ({pct}%)',
    tip: '문틀에 양팔을 대고 가슴을 앞으로 30초 스트레칭, 하루 3회',
  },
  pelvicTilt: {
    title: '골반 경사',
    good: '중립 골반, 균형 잡힌 저울 ⚖️ ({deg}°)',
    warn: '{variantLabel}이 살짝 보여요 ({deg}°)',
    bad: '{variantLabel} ({deg}°)',
    tip: '전방경사는 복근·엉덩이 근육, 후방경사는 허리 신전 스트레칭이 도움이 돼요',
  },
  trunkLean: {
    title: '상체 기울기',
    good: '수직으로 선 등대 🗼 ({deg}°)',
    warn: '{variantLabel} 살짝 기울었어요 ({deg}°)',
    bad: '{variantLabel} {deg}° 기울었어요',
    tip: '발뒤꿈치·엉덩이·어깨·뒤통수가 벽에 닿게 1분 서기 연습',
  },
};

/** 변형(방향) 라벨 — kneeAlign/pelvicTilt/trunkLean의 {variantLabel} */
export const VARIANT_LABEL: Record<string, string> = {
  o: 'O자 경향 (카우보이 다리 🤠)',
  x: 'X자 경향 (펭귄 다리 🐧)',
  neutral: '중립',
  anterior: '오리 엉덩이 🦆 전방경사 경향',
  posterior: '주저앉은 곰 🐻 후방경사 경향',
  forward: '앞으로',
  backward: '뒤로',
};

/** 등급별 템플릿을 실제 수치로 채운 항목 메시지 */
export function postureMessage(item: GradedItem): string {
  const c = POSTURE_COPY[item.id];
  return fillTemplate(c[item.grade], {
    deg: item.value.toFixed(1),
    pct: item.value.toFixed(1),
    side: sideLabel(item.variant),
    variantLabel: VARIANT_LABEL[item.variant] ?? '',
  });
}

export const HEADLINES: Record<string, { title: string; sub: string }> = {
  perfect: { title: '운동선수처럼 완벽합니다 🏅', sub: '모든 항목이 양호 범위예요. 지금 자세를 유지하세요!' },
  shoulderTilt: { title: '피사의 사탑이시군요 🗼', sub: '어깨가 한쪽으로 기울어 있어요.' },
  hipTilt: { title: '피사의 사탑이시군요 🗼', sub: '골반이 한쪽으로 기울어 있어요.' },
  headTilt: { title: '피사의 사탑이시군요 🗼', sub: '머리가 한쪽으로 기울어 있어요.' },
  centerDeviation: { title: '바람 맞은 갈대시군요 🌾', sub: '몸의 중심선이 한쪽으로 흔들려 있어요.' },
  kneeAlign: { title: '다리 정렬을 확인해 보세요 🦵', sub: '무릎이 엉덩이–발목 선에서 많이 벗어나 있어요.' },
  'kneeAlign.o': { title: '카우보이 다리시군요 🤠', sub: '무릎이 바깥으로 벌어진 O자 경향이에요.' },
  'kneeAlign.x': { title: '펭귄 다리시군요 🐧', sub: '무릎이 안쪽으로 모이는 X자 경향이에요.' },
  forwardHead: { title: '당신은 거북이시군요 🐢', sub: '머리가 어깨보다 앞으로 나와 있어요.' },
  roundShoulder: { title: '고양이처럼 등이 둥글어요 🐱', sub: '어깨가 앞으로 말려 있어요.' },
  pelvicTilt: { title: '골반이 기울어 있어요 🦆', sub: '골반 경사 경향이 보여요.' },
  'pelvicTilt.anterior': { title: '오리 엉덩이시군요 🦆', sub: '골반이 앞으로 기울어 허리가 과하게 휘어요.' },
  'pelvicTilt.posterior': { title: '주저앉은 곰이시군요 🐻', sub: '골반이 뒤로 기울어 엉덩이가 처져 보여요.' },
  trunkLean: { title: '상체가 기울어 있어요 ⛷️', sub: '상체가 수직에서 벗어나 있어요.' },
  'trunkLean.forward': { title: '앞으로 쏠린 스키점프 선수 ⛷️', sub: '상체가 앞으로 기울어 있어요.' },
  'trunkLean.backward': { title: '뒤로 기댄 리클라이너 🛋️', sub: '상체가 뒤로 기울어 있어요.' },
};

export function headlineCopy(h: Headline): { title: string; sub: string } {
  return HEADLINES[`${h.id}.${h.variant}`] ?? HEADLINES[h.id];
}

export const UI_TEXT = {
  appName: 'BodyScan',
  tagline: '카메라만 켜면 끝. 저장도, 전송도 없는 체형분석',
  privacyClaim: '영상은 저장되지 않고 이 기기 밖으로 나가지 않습니다 · 서버 없음',
  startButton: '측정 시작',
  guideTitle: '측정 준비',
  guide: [
    '폰을 허리~가슴 높이에 세워 두세요',
    '2~2.5m 뒤로 물러나 전신이 보이게',
    '밝은 곳, 몸에 붙는 옷이 정확해요',
    '발은 골반 너비로 벌리고 팔은 자연스럽게 내려 주세요',
  ],
  cameraStarting: '카메라 권한을 허용해 주세요',
  loadingModel: '분석 엔진 준비 중…',
  privacyOk: '📵 네트워크 전송 0건 · 영상은 이 기기 밖으로 나가지 않습니다',
  privacyBad: (n: number) => `⚠️ 네트워크 요청 ${n}건 감지`,
  setupHint: '전신이 보이도록 뒤로 물러나 주세요',
  setupOk: '좋아요, 그대로 서 계세요',
  setupTimeout: '더 뒤로 물러나거나 밝은 곳에서 시도해 주세요',
  frontHint: '정면을 바라봐 주세요',
  frontMeasuring: '정면 측정 중… 움직이지 마세요',
  sideHint: '왼쪽으로 90° 돌아서 옆모습을 보여주세요',
  sideMeasuring: '측면 측정 중… 움직이지 마세요',
  cameraOff: '카메라가 꺼졌습니다. 영상은 어디에도 남지 않았습니다.',
  share: '공유하기',
  shareUnsupported: '이 브라우저는 공유를 지원하지 않습니다',
  retry: '다시 측정',
  disclaimer: '재미와 참고용 결과이며 의료적 진단이 아닙니다. 단일 카메라 2D 추정이라 오차가 있을 수 있어요.',
  cameraDenied: '카메라 권한이 필요해요',
  cameraUnavailable: '카메라를 사용할 수 없어요',
  cameraUnavailableBody: '다른 앱이 카메라를 쓰고 있지 않은지 확인하고 다시 시도해 주세요.',
  measureDone: '측정이 끝났어요',
  detectFailed: '분석 중 문제가 생겼어요',
  detectFailedBody: '카메라를 끄고 처음부터 다시 시도해 주세요.',
  cameraDeniedBody: '브라우저 설정에서 이 사이트의 카메라 권한을 허용한 뒤 다시 시도해 주세요.',
  modelFailed: '분석 엔진을 불러오지 못했어요',
  modelFailedBody: '최초 1회는 인터넷 연결이 필요합니다. 연결을 확인하고 다시 시도해 주세요.',
  desktopTitle: '모바일에서 열어주세요 📱',
  desktopBody: '전면 카메라로 전신을 찍어야 해서 폰에서 가장 잘 동작해요. QR을 스캔하세요.',
  skeletonOnly: '스켈레톤만 보기',
  voice: '음성 안내',
  adPlaceholder: '광고 자리',
} as const;

export const RESULT_TEXT = {
  gradeLabel: { good: '양호', warn: '주의', bad: '불균형' },
  categoryLabel: { top: '상의', bottom: '하의', outer: '아우터' },
  categoryEmoji: { top: '👕', bottom: '👖', outer: '🧥' },
  allGood: '모든 항목 양호 ✨',
  attention: (n: number) => `주의가 필요한 항목 ${n}개`,
  proportionTitle: '체형 비율',
  ratioShoulderHip: '어깨:골반',
  ratioTorsoLeg: '상체:하체',
  ratioThighCalf: '허벅지:종아리',
  styleTitle: '어울리는 스타일 👗',
  avoidLabel: '🚫 피하면 좋은 것',
  productCta: '어울리는 옷 보기 →',
  diagramFront: '정면',
  diagramSide: '측면',
  shareCardTagline: '저장 없는 실시간 체형분석',
  shareCardFooter: '📵 영상은 저장되지 않았습니다 · 결과 수치만 담긴 카드입니다',
  shareTitle: 'BodyScan 결과',
  shareText: '저장 없는 실시간 체형분석 결과',
} as const;

export interface StyleAdvice {
  top: string;
  bottom: string;
  outer: string;
  avoid: string;
}

export const SHAPE_COPY = {
  shoulderHip: {
    inverted: { label: '역삼각형', emoji: '🏊', desc: '어깨가 골반보다 넓은 수영선수 체형' },
    balanced: { label: '균형형', emoji: '🏛️', desc: '어깨와 골반이 비슷한 안정감 있는 기둥형' },
    triangle: { label: '삼각형', emoji: '🍐', desc: '골반이 어깨보다 넓어 하체가 안정적인 체형' },
  } satisfies Record<ShoulderHipType, { label: string; emoji: string; desc: string }>,
  torsoLeg: {
    longTorso: { label: '상체형', emoji: '🦍', desc: '상체가 긴 편, 허리선을 올려주면 좋아요' },
    balanced: { label: '균형형', emoji: '🧍', desc: '상·하체 비율이 균형 잡혔어요' },
    longLegs: { label: '롱다리형', emoji: '🦩', desc: '다리가 긴 플라밍고 비율' },
  } satisfies Record<TorsoLegType, { label: string; emoji: string; desc: string }>,
};

export const STYLE_COPY: Record<BodyTypeKey, StyleAdvice> = {
  'inverted-longTorso': {
    top: 'V넥·딥 라운드넥으로 시선을 아래로. 어깨 디테일 없는 심플한 상의',
    bottom: '하이웨이스트 와이드 팬츠로 허리선을 올리고 하체에 볼륨을',
    outer: '허리 벨트 코트, 롱 가디건으로 세로 라인 강조',
    avoid: '숄더패드, 보트넥, 로우라이즈 팬츠',
  },
  'inverted-balanced': {
    top: 'V넥·헨리넥 티셔츠, 어깨를 가르는 세로 스트라이프',
    bottom: '와이드·스트레이트 팬츠, 밝은색·패턴 하의로 균형',
    outer: '엉덩이를 덮는 길이의 재킷, 라펠이 좁은 블레이저',
    avoid: '퍼프 소매, 보트넥, 스키니 팬츠',
  },
  'inverted-longLegs': {
    top: '롱 기장 상의·튜닉으로 상체를 길게, V넥으로 어깨 분산',
    bottom: '미드라이즈 와이드 팬츠, 카고·플리츠 등 볼륨 있는 하의',
    outer: '오버사이즈 롱 코트, 힙을 덮는 셔츠 재킷',
    avoid: '크롭 상의 + 하이웨이스트 조합(상체가 더 짧아 보여요), 숄더패드',
  },
  'balanced-longTorso': {
    top: '크롭·짧은 기장 상의, 상의를 하의에 넣는 턱인 스타일',
    bottom: '하이웨이스트 팬츠·스커트로 다리를 길게',
    outer: '짧은 기장 재킷·크롭 블루종',
    avoid: '엉덩이를 덮는 긴 상의, 로우라이즈 팬츠',
  },
  'balanced-balanced': {
    top: '대부분 잘 어울려요. 핏이 좋은 기본 티셔츠·셔츠',
    bottom: '스트레이트·슬림 스트레이트 팬츠가 기본값',
    outer: '테일러드 재킷, 트렌치코트 등 클래식 아이템',
    avoid: '너무 과한 오버사이즈만 피하면 돼요',
  },
  'balanced-longLegs': {
    top: '롱 기장 티셔츠·셔츠, 레이어드로 상체에 볼륨',
    bottom: '미드라이즈·로우라이즈 팬츠, 스트레이트 핏',
    outer: '힙을 덮는 롱 재킷·코트',
    avoid: '크롭 상의 + 하이웨이스트(비율이 과장돼요)',
  },
  'triangle-longTorso': {
    top: '보트넥·숄더 디테일·밝은색 상의로 어깨 강조, 크롭 기장',
    bottom: '다크톤 하이웨이스트 스트레이트·부츠컷',
    outer: '숄더라인이 살아 있는 짧은 재킷, 어깨 포인트 가디건',
    avoid: '힙 라인에서 끝나는 상의, 밝은색 스키니',
  },
  'triangle-balanced': {
    top: '보트넥·오프숄더·패턴 상의로 시선을 위로',
    bottom: '다크톤 스트레이트·부츠컷, A라인 스커트',
    outer: '숄더패드 블레이저, 구조적인 재킷',
    avoid: '힙에 포인트 있는 하의(큰 포켓·밝은 패턴), 스키니',
  },
  'triangle-longLegs': {
    top: '롱 기장·볼륨 있는 상의, 보트넥·퍼프 소매',
    bottom: '미드라이즈 스트레이트·와이드, 다크톤',
    outer: '어깨 포인트 있는 롱 코트',
    avoid: '크롭 상의, 밝은색 타이트 하의',
  },
};
