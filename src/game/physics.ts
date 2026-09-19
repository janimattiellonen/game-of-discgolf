import {
  ARC_BASE,
  ARC_MAX,
  ARC_PER_D,
  CATCH_H,
  CATCH_R,
  CATCH_SPEED,
  DUR_BASE,
  DUR_PER_D,
  SIG_A0,
  SIG_A1,
  SIG_D0,
  SIG_D1,
  SKID_DECEL,
  WATER_DECEL,
} from './constants';
import { BASKET, groundAt, heightAt, inGrid, isWater } from './course';
import type { Disc } from './discs';
import { effort } from './discs';
import type { BasketEvent, Flight, SkidPath, Vec } from './types';

/** Where the power bar sits between this disc's softest and hardest throw. */
export const throwDist = (disc: Disc, p: number) => disc.min + p * (disc.max - disc.min);

/**
 * Scatter is keyed to the DISTANCE of the throw, not to the power bar - see effort() in
 * discs.ts for why keying it to the bar inverts the design. The disc's own multiplier is
 * what separates the three at any given range.
 */
export const sigA = (disc: Disc, carry: number) =>
  (SIG_A0 + effort(carry) * (SIG_A1 - SIG_A0)) * disc.control;

export const sigD = (disc: Disc, carry: number) =>
  carry * (SIG_D0 + effort(carry) * (SIG_D1 - SIG_D0)) * disc.spread;

export const flightDur = (d: number) => DUR_BASE + d * DUR_PER_D;
export const flightArc = (d: number) => Math.min(ARC_MAX, ARC_BASE + d * ARC_PER_D);

/**
 * Surface sets the deceleration: water grabs the disc almost at once, grass lets it run.
 * On grass the disc's own rim decides how hard it bites - a driver keeps going where a
 * putter sits down. Water is not scaled by grip: it stops everything, and a driver skipping
 * across a pond is not a feature.
 */
const decelAt = (disc: Disc, x: number, y: number) =>
  inGrid(x | 0, y | 0) && isWater(x | 0, y | 0) ? WATER_DECEL : SKID_DECEL * disc.grip;

/**
 * The descent angle matters as much as the speed: a disc dropping steeply plants, a flat
 * arriving disc skips. Only the along-ground component of the impact carries into the slide.
 */
export function impactSpeed(d: number): number {
  const t = flightDur(d);
  const vh = d / t; // horizontal speed at touchdown
  const vv = (flightArc(d) * Math.PI) / t; // |dh/dt| at t=1 for the sine arc
  return vh * Math.cos(Math.atan2(vv, vh));
}

/**
 * With the surface varying along the slide there is no closed form, so step it: the disc is
 * decelerated by whatever it is sliding over right now. A disc that runs off grass into
 * water stops just past the shoreline instead of gliding on across it.
 */
export function skidPath(start: Vec, a: number, d: number, disc: Disc): SkidPath {
  const dt = 1 / 120;
  const samples = [0];
  let v = impactSpeed(d);
  let s = 0;
  while (v > 0 && samples.length < 600) {
    v = Math.max(0, v - decelAt(disc, start.x + Math.cos(a) * s, start.y + Math.sin(a) * s) * dt);
    s += v * dt;
    samples.push(s);
  }
  return { dist: s, dur: (samples.length - 1) * dt, samples, dt };
}

/** Where a throw of carry d along angle a comes to rest, measured from the lie. */
export const restDist = (lie: Vec, a: number, d: number, disc: Disc) =>
  d + skidPath({ x: lie.x + Math.cos(a) * d, y: lie.y + Math.sin(a) * d }, a, d, disc).dist;

/**
 * Walk the whole path - carry then skid - and return the first moment the disc is inside
 * the basket cylinder, with the speed it is carrying at that moment.
 */
export function basketEvent(f: Flight, elev: boolean): BasketEvent | null {
  const bh = elev ? heightAt(BASKET.x | 0, BASKET.y | 0) : 0;
  const step = 1 / 240;
  const end = f.dur + f.skidDur;
  for (let t = 0; t <= end; t += step) {
    let x: number;
    let y: number;
    let h: number;
    let v: number;
    if (t <= f.dur) {
      const u = t / f.dur;
      x = f.from.x + (f.to.x - f.from.x) * u;
      y = f.from.y + (f.to.y - f.from.y) * u;
      h = (elev ? f.h0 + (f.h1 - f.h0) * u : 0) + Math.sin(Math.PI * u) * f.arc;
      v = f.d / f.dur; // carry speed is constant across the flight
    } else {
      const i = Math.min(f.skid.samples.length - 2, Math.floor((t - f.dur) / f.skid.dt));
      const s0 = f.skid.samples[i];
      const s1 = f.skid.samples[i + 1];
      x = f.to.x + Math.cos(f.a) * s0;
      y = f.to.y + Math.sin(f.a) * s0;
      h = groundAt(x, y, elev);
      v = (s1 - s0) / f.skid.dt;
    }
    if (Math.hypot(x - BASKET.x, y - BASKET.y) > CATCH_R) continue;
    if (h < bh || h > bh + CATCH_H) continue; // sailed over the cage, or passed below it
    return { t, pos: { x, y }, v, caught: v <= CATCH_SPEED };
  }
  return null;
}

export const isOB = (x: number, y: number) => !inGrid(x | 0, y | 0) || isWater(x | 0, y | 0);

/**
 * Real disc golf: OB costs a stroke and you play from where the disc LAST crossed the OB
 * line, not from the previous lie. If the flight crosses OB, comes back in and goes out
 * again, it is that last crossing that counts - so scan the whole path and keep the final
 * in-bounds point rather than stopping at the first one.
 */
export function lastCrossing(from: Vec, to: Vec): Vec {
  const N = 240; // ~0.05 tiles per step over a max-length throw
  let last: Vec = { ...from };
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    if (!isOB(x, y)) last = { x, y };
  }
  return last;
}
