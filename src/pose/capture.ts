import type { Pose } from './landmarks';
import { HoldTimer } from './gating';
import { PoseSampler } from './sampler';

export type StageStep = 'align' | 'countdown' | 'sampling';

export interface StageStatus {
  step: StageStep;
  ok: boolean;
  /** align 단계 유지 진행도 0..1 */
  holdProgress: number;
  /** countdown 단계 남은 초(3,2,1), 그 외 0 */
  countdown: number;
  /** sampling 단계 진행도 0..1 */
  sampleProgress: number;
  /** sampling 완료 시 중앙값 포즈 */
  done?: Pose;
}

export interface CaptureOptions {
  holdMs?: number;
  countdownMs?: number;
  sampleMs?: number;
}

/**
 * 한 번의 측정(정면 또는 측면)을 담당하는 단계 머신.
 * 조건 유지(hold) → 카운트다운 → 샘플링. 조건이 깨지면 처음으로.
 */
export class CaptureStage {
  private readonly countdownMs: number;
  private readonly hold: HoldTimer;
  private readonly sampler: PoseSampler;
  private step: StageStep = 'align';
  private countdownStart = 0;

  constructor(private readonly isOk: (pose: Pose) => boolean, opts: CaptureOptions = {}) {
    this.countdownMs = opts.countdownMs ?? 3000;
    this.hold = new HoldTimer(opts.holdMs ?? 1500);
    this.sampler = new PoseSampler(opts.sampleMs ?? 3000);
  }

  reset(): void {
    this.step = 'align';
    this.hold.reset();
    this.sampler.reset();
  }

  update(pose: Pose | null, now: number): StageStatus {
    const base: StageStatus = { step: this.step, ok: false, holdProgress: 0, countdown: 0, sampleProgress: 0 };

    if (!pose || !this.isOk(pose)) {
      this.reset();
      return { ...base, step: 'align' };
    }
    base.ok = true;

    if (this.step === 'align') {
      const held = this.hold.update(true, now);
      if (!held) return { ...base, holdProgress: this.hold.progress(now) };
      this.step = 'countdown';
      this.countdownStart = now;
    }

    if (this.step === 'countdown') {
      const remaining = this.countdownMs - (now - this.countdownStart);
      if (remaining > 0) return { ...base, step: 'countdown', countdown: Math.ceil(remaining / 1000) };
      this.step = 'sampling';
      this.sampler.reset();
    }

    // sampling
    this.sampler.add(pose, now);
    if (this.sampler.isComplete(now)) {
      const done = this.sampler.result();
      this.reset();
      return { ...base, step: 'sampling', sampleProgress: 1, done };
    }
    return { ...base, step: 'sampling', sampleProgress: this.sampler.progress(now) };
  }
}
