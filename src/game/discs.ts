import { clamp } from './math';
import { tl } from './scale';

export type DiscType = 'putter' | 'midrange' | 'driver';

/** Bag order - shortest to longest. The picker and the tests both read it. */
export const DISC_TYPES = ['putter', 'midrange', 'driver'] as const;

export interface Disc {
  type: DiscType;
  /** the ends of the power bar, in TILES */
  min: number;
  max: number;
  /** multiplies angular scatter: below 1 is easier to control */
  control: number;
  /** multiplies distance scatter */
  spread: number;
  /** multiplies SKID_DECEL: below 1 slides further */
  grip: number;
}

/**
 * Authored in metres, because that is how discs are talked about, and derived to tiles here
 * so nothing downstream of this table ever sees a metre. Metres are a display unit; tl() at
 * the edge is the one place a real-world figure enters the model.
 */
const disc = (
  type: DiscType,
  minM: number,
  maxM: number,
  control: number,
  spread: number,
  grip: number,
): Disc => ({ type, min: tl(minM), max: tl(maxM), control, spread, grip });

/**
 * Three discs, one of each, and five numbers apiece: how far it goes, how wild it is, and
 * how far it runs out once it lands.
 *
 * The MIDRANGE IS THE UNIT DISC - 1.0 in all three multiplier columns - so the table reads
 * as deviations from it. That is a statement about the table, not about the old single-disc
 * feel: nothing here flies like the disc this replaces, because the scatter curve is keyed
 * to distance now rather than to the power bar (see sigA in physics.ts).
 *
 * The putter's floor is not a free choice: it is GIMME_R, the tap-in radius, and
 * discs.test.ts asserts they stay equal. Anything above it would be a range where no disc
 * can throw and the tap-in is not offered either.
 *
 * Reach is paid for three times over. A driver goes 75 m, but it scatters 1.25x as wide,
 * misses its distance by 1.3x as much, and decelerates at 0.55x the rate once it touches
 * down - so it is also the disc that will not stop near the basket. A putter is the mirror
 * of that. The floors matter as much as the ceilings: a driver cannot be feathered down to
 * a putt, which is what makes the choice real inside 20 m.
 */
export const DISCS: Record<DiscType, Disc> = {
  putter: disc('putter', 4, 25, 0.65, 0.75, 1.6),
  midrange: disc('midrange', 12, 55, 1, 1, 1),
  driver: disc('driver', 20, 75, 1.25, 1.3, 0.55),
};

/**
 * The yardstick every throw's effort is measured against - the longest throw in the bag.
 *
 * Written out rather than derived from DISCS.driver.max on purpose: derived, retuning the
 * driver would silently rescale the putter's scatter too, which is a coupling nobody reading
 * the putter's row would expect. discs.test.ts asserts the two stay equal, so the drift is
 * caught without the coupling being real.
 */
export const REF_M = 75;
export const REF_D = tl(REF_M);

/**
 * How hard this throw is, as a fraction of the longest throw anyone can make - NOT as a
 * fraction of this disc's own range. That distinction is the whole design:
 *
 * With per-disc ranges the power bar stops meaning the same thing on different discs. A 25 m
 * throw is full power on a putter and a feather on a driver, so scatter keyed to the bar
 * would make the driver the ACCURATE disc at short range (9.1 deg against 5.0 deg) - exactly
 * backwards, and not fixable by tuning the multipliers, because the cause is the
 * normalisation. Keyed to distance instead, a putter is tighter than a driver at every range
 * they share.
 */
export const effort = (carry: number) => clamp(carry / REF_D, 0, 1);
