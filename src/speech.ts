let enabled = true;

export function isVoiceEnabled(): boolean {
  return enabled;
}

export function setVoiceEnabled(on: boolean): void {
  enabled = on;
  if (!on && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

/** 직전 발화를 끊고 한국어로 읽는다. 미지원·비활성이면 무시. */
export function speak(text: string): void {
  if (!enabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 1.05;
  window.speechSynthesis.speak(u);
}
