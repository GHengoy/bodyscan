import type { ProportionMetrics, ShoulderHipType, TorsoLegType } from './proportion';
import { STYLE_COPY, type StyleAdvice } from '../copy';

export type BodyTypeKey = `${ShoulderHipType}-${TorsoLegType}`;

type Shape = Pick<ProportionMetrics, 'shoulderHipType' | 'torsoLegType'>;

export function bodyTypeKey(p: Shape): BodyTypeKey {
  return `${p.shoulderHipType}-${p.torsoLegType}`;
}

export function recommendStyle(p: Shape): StyleAdvice & { key: BodyTypeKey } {
  const key = bodyTypeKey(p);
  return { key, ...STYLE_COPY[key] };
}
