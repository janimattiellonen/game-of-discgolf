import type { Vec } from './types';

export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const deg = (r: number) => (r * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;

/** Interpolate inside a [min, max] tuning range. */
export const lerp = (r: readonly [number, number], t: number) => r[0] + (r[1] - r[0]) * t;

/** Box-Muller. Unbounded, which is why angular error is hard-capped at MAX_ERR_A. */
export function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
