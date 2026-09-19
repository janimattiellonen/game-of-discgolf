import { describe, expect, it } from 'vitest';
import { FLIER_GAIN, GIMME_R } from './constants';
import { DISCS, DISC_KEYS, DISC_TYPES, REF_D, effort, flierGain } from './discs';
import { m } from './scale';
import { expectAscending } from '../test-utils';

const inOrder = DISC_TYPES.map((t) => DISCS[t]);

describe('the disc table', () => {
  it('can throw every disc', () => {
    for (const d of inOrder) expect(d.min).toBeLessThan(d.max);
  });

  it('reaches further with every disc down the list', () => {
    expectAscending(inOrder.map((d) => d.min));
    expectAscending(inOrder.map((d) => d.max));
  });

  /**
   * The three trade-offs have to point the same way: a disc that reaches further is harder
   * to control and slides longer. A typo that flipped one column would leave a table that
   * still looks plausible and a game where the driver is the safe disc, so the shape is
   * asserted rather than the numbers.
   */
  it('pays for reach in control, spread and run-out together', () => {
    expectAscending(inOrder.map((d) => d.control));
    expectAscending(inOrder.map((d) => d.spread));
    // grip runs the other way: the disc that reaches furthest brakes least.
    expectAscending(inOrder.map((d) => -d.grip));
  });

  /** Every multiplier is read against the midrange, so it has to be the literal 1.0 row. */
  it('defines the midrange as the unit disc', () => {
    expect(DISCS.midrange.control).toBe(1);
    expect(DISCS.midrange.spread).toBe(1);
    expect(DISCS.midrange.grip).toBe(1);
  });

  /**
   * The tap-in circle and the softest throw in the bag are the same distance, which is the
   * rule GIMME_R was written for: inside the shortest possible throw there is no shot to
   * play. Let them drift apart and the band between them has no legal shot in it - too far
   * to tap in, closer than any disc can throw - so the player has to overshoot into the
   * circle and tap in from there, paying a stroke they can neither avoid nor understand.
   */
  it('starts the putter exactly at the edge of the tap-in circle', () => {
    expect(DISCS.putter.min).toBeCloseTo(GIMME_R, 10);
  });

  it('authors the table in metres', () => {
    expect(m(DISCS.putter.min)).toBeCloseTo(4, 6);
    expect(m(DISCS.putter.max)).toBeCloseTo(25, 6);
    expect(m(DISCS.midrange.max)).toBeCloseTo(55, 6);
    expect(m(DISCS.driver.max)).toBeCloseTo(75, 6);
  });
});

describe('DISC_KEYS', () => {
  it('binds one distinct key per disc', () => {
    const keys = DISC_TYPES.map((t) => DISC_KEYS[t]);
    expect(new Set(keys).size).toBe(DISC_TYPES.length);
    for (const k of keys) expect(k).toMatch(/^[A-Z]$/);
  });
});

describe('flierGain', () => {
  it('spans the 5-15% bonus across the roll', () => {
    expect(flierGain(0)).toBeCloseTo(1.05, 10);
    expect(flierGain(1)).toBeCloseTo(1.15, 10);
    expect(flierGain(0.5)).toBeCloseTo(1.1, 10);
  });

  it('never takes distance away', () => {
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(flierGain(roll)).toBeGreaterThan(1);
      expect(flierGain(roll)).toBeLessThanOrEqual(FLIER_GAIN[1]);
    }
  });

  it('rises with the roll', () => {
    expectAscending([0, 0.3, 0.6, 0.9].map(flierGain));
  });

  it('clamps a roll outside the unit range', () => {
    expect(flierGain(-1)).toBe(FLIER_GAIN[0]);
    expect(flierGain(9)).toBe(FLIER_GAIN[1]);
  });
});

describe('effort', () => {
  /**
   * REF_D is written out as its own constant so that retuning the driver cannot silently
   * rescale every other disc's scatter. The relationship still has to hold - if the longest
   * throw in the bag falls short of the yardstick, effort never reaches 1 and the top of the
   * scatter curve becomes unreachable - so it is asserted here instead, which makes moving
   * the driver a decision somebody has to make out loud.
   */
  it('uses the longest throw in the bag as its yardstick', () => {
    expect(REF_D).toBeCloseTo(DISCS.driver.max, 10);
    expect(effort(DISCS.driver.max)).toBeCloseTo(1, 10);
  });

  it('rises from nothing at rest to 1 at full reach', () => {
    expect(effort(0)).toBe(0);
    expect(effort(REF_D / 2)).toBeCloseTo(0.5, 10);
  });

  it('clamps at both ends', () => {
    expect(effort(-5)).toBe(0);
    expect(effort(REF_D * 3)).toBe(1);
  });
});
