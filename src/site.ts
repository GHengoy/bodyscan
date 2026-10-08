/** 현재 배포의 공개 주소(절대 URL, 슬래시로 끝). 공유 링크·카드 워터마크에 쓴다. */
export function siteUrl(): string {
  return location.origin + import.meta.env.BASE_URL;
}

/** 카드 등에 표시할 짧은 주소(프로토콜 제외, 끝 슬래시 제거) */
export function siteHost(): string {
  return siteUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');
}
