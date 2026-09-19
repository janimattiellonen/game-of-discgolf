/**
 * The measurement that decided whether the disc model could ship, kept so its numbers can be
 * re-derived rather than taken on trust. Those figures are quoted in constants.ts, course.ts
 * and course.test.ts, and a number stated as fact in three source files should not rest on a
 * harness somebody deleted.
 *
 *     pnpm sim
 *
 * SKIPPED by default. It is a measurement, not a regression gate: 200k throws is too slow for
 * the normal suite, and pinning the game's balance with an assertion would freeze a hole the
 * measurement spec is already planning to replace. It asserts only that the model is wired up
 * - the output is the point, and reading it is a human's job.
 *
 * It runs entirely on the shipped functions - DISCS, sigA, sigD, throwDist, skidPath,
 * flierGain - so it cannot drift from the game the way a reimplementation would.
 */
import { describe, expect, it } from 'vitest';
import { FLIER_P, GIMME_R, MAX_ERR_A, OVER_A, OVER_D, OVER_SHORT } from './constants';
import { BASKET, TEE, inGrid, isWater } from './course';
import type { Disc } from './discs';
import { DISCS, DISC_TYPES, flierGain } from './discs';
import { clamp, dist, gauss, lerp, rad } from './math';
import { sigA, sigD, skidPath, throwDist } from './physics';
import { m, tl } from './scale';
import type { Vec } from './types';

/**
 * tsconfig.app.json deliberately has no node types - src/game/ is environment-free - so the
 * opt-in flag is read off globalThis rather than dragging @types/node into the app config
 * for one string.
 */
const SIM = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  ?.SIM;

const N = 200_000;
const ob = (p: Vec) => !inGrid(p.x | 0, p.y | 0) || isWater(p.x | 0, p.y | 0);

interface Result {
  drowned: number;
  tapIn: number;
  within10: number;
  meanLeft: number;
}

/**
 * One tee shot, aimed straight at the pin, resolved exactly as release() and land() do:
 * angular and distance scatter, the optional flier, the skid, then the resting tile. A rest
 * in water or off the grid is the OB penalty; a rest inside GIMME_R is holed in two.
 */
function tee(disc: Disc, power: number, flier: boolean, blown = false): Result {
  const aim = Math.atan2(BASKET.y - TEE.y, BASKET.x - TEE.x);
  let drowned = 0;
  let tapIn = 0;
  let within10 = 0;
  let sum = 0;

  for (let i = 0; i < N; i++) {
    const d0 = throwDist(disc, power);
    const sev = blown ? Math.random() : 0;
    const ea = clamp(
      rad(gauss() * sigA(disc, d0) * (blown ? lerp(OVER_A, sev) : 1)),
      -MAX_ERR_A,
      MAX_ERR_A,
    );
    const ed = gauss() * sigD(disc, d0) * (blown ? lerp(OVER_D, sev) : 1);
    const shrink = blown ? lerp(OVER_SHORT, sev) : 1;
    const gain = flier && !blown && Math.random() < FLIER_P ? flierGain(Math.random()) : 1;

    const a = aim + ea;
    const carry = Math.max(0.4, (d0 + ed) * shrink * gain);
    const to = { x: TEE.x + Math.cos(a) * carry, y: TEE.y + Math.sin(a) * carry };
    const slide = skidPath(to, a, carry, disc).dist;
    const rest = { x: to.x + Math.cos(a) * slide, y: to.y + Math.sin(a) * slide };

    if (ob(rest)) {
      drowned++;
      continue;
    }
    const left = dist(rest, BASKET);
    sum += left;
    if (left <= GIMME_R) tapIn++;
    if (left <= tl(10)) within10++;
  }

  const inBounds = N - drowned;
  return {
    drowned: drowned / N,
    tapIn: tapIn / N,
    within10: within10 / N,
    meanLeft: inBounds ? m(sum / inBounds) : NaN,
  };
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const row = (label: string, r: Result) =>
  `${label.padEnd(32)} drown ${pct(r.drowned).padStart(6)}   tap-in ${pct(r.tapIn).padStart(6)}` +
  `   <=10m ${pct(r.within10).padStart(6)}   mean left ${r.meanLeft.toFixed(1)} m`;

describe.skipIf(!SIM)('monte carlo: the tee shot', () => {
  it('is wired to the shipped model', () => {
    expect(throwDist(DISCS.driver, 1)).toBe(DISCS.driver.max);
  });

  it('measures every disc off the tee', () => {
    const out = [`hole ${m(dist(TEE, BASKET)).toFixed(1)} m, gimme ${m(GIMME_R)} m, N=${N}`];

    for (const type of DISC_TYPES) {
      for (const flier of [false, true]) {
        out.push(row(`${type} full power${flier ? ' + flier' : ''}`, tee(DISCS[type], 1, flier)));
      }
    }

    /**
     * The interesting driver question is not full power. Scatter no longer punishes the top
     * of the bar much (see the banner in constants.ts), but the water still does.
     */
    for (const power of [0.8, 0.9, 1]) {
      const carry = throwDist(DISCS.driver, power);
      out.push(
        row(
          `driver p=${power.toFixed(2)} (${m(carry).toFixed(0)} m) + flier`,
          tee(DISCS.driver, power, true),
        ),
      );
    }

    out.push(row('driver full power, overcharged', tee(DISCS.driver, 1, true, true)));

    console.log('\n' + out.join('\n') + '\n');
  });
});
