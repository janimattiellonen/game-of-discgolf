import { describe, expect, it } from 'vitest';
import { CATCH_SPEED, SKID_DECEL } from './constants';
import { BASKET } from './course';
import type { Disc } from './discs';
import { DISCS, DISC_TYPES } from './discs';
import {
  basketEvent,
  flightArc,
  flightDur,
  impactSpeed,
  restDist,
  sigA,
  sigD,
  skidPath,
  throwDist,
} from './physics';
import { m, tl } from './scale';
import type { BasketEvent } from './types';

/**
 * Arbitrary tile distances for the tests that just need "a long throw" or "a short one".
 * Deliberately NOT derived from the disc table: the arc saturating at 3.2 and water killing
 * a slide inside 0.2 tiles are properties of the physics, not of the driver, and pointing
 * them at DISCS would turn a dozen unrelated tests red every time a disc is retuned.
 */
const LONG = 11;
const SHORT = 0.8;

const { putter, midrange, driver } = DISCS;
const overPower = (n = 21) => Array.from({ length: n }, (_, i) => i / (n - 1));

describe('throwDist', () => {
  /** The authored metres are pinned once, in discs.test.ts. Here it is the mapping. */
  it('increases with power, from each disc floor to its ceiling', () => {
    for (const t of DISC_TYPES) {
      const ds = overPower().map((p) => throwDist(DISCS[t], p));
      expect(ds).toEqual([...ds].sort((a, b) => a - b));
      expect(ds[0]).toBe(DISCS[t].min);
      expect(ds.at(-1)).toBe(DISCS[t].max);
    }
  });
});

describe('scatter', () => {
  /**
   * THE test of the disc model. Scatter is keyed to throw distance rather than to the power
   * bar precisely so that a putter is tighter than a driver at every range they share - key
   * it to the bar and a 25 m throw is full power on a putter but a feather on a driver,
   * which makes the DRIVER the accurate disc at short range.
   *
   * That failure is invisible in play until someone notices the bag is backwards, so it is
   * worth asserting directly rather than trusting the formula to stay the right shape.
   */
  it('orders the bag putter < midrange < driver at every shared distance', () => {
    for (const metres of [25, 20, 15]) {
      const carry = tl(metres);
      expect(sigA(putter, carry)).toBeLessThan(sigA(midrange, carry));
      expect(sigA(midrange, carry)).toBeLessThan(sigA(driver, carry));
      expect(sigD(putter, carry)).toBeLessThan(sigD(midrange, carry));
      expect(sigD(midrange, carry)).toBeLessThan(sigD(driver, carry));
    }
  });

  it('widens both cones monotonically with the length of the throw', () => {
    for (const t of DISC_TYPES) {
      const d = DISCS[t];
      const carries = overPower().map((p) => throwDist(d, p));
      const angles = carries.map((c) => sigA(d, c));
      const dists = carries.map((c) => sigD(d, c));
      expect(angles).toEqual([...angles].sort((a, b) => a - b));
      expect(dists).toEqual([...dists].sort((a, b) => a - b));
    }
  });

  /** The unit disc rides the raw curve, so the tuning constants are still readable in it. */
  it('puts the midrange on the bare effort curve', () => {
    expect(sigA(midrange, 0)).toBeCloseTo(3, 6);
    expect(sigA(midrange, driver.max)).toBeCloseTo(14, 6);
  });

  /**
   * sigD is a FRACTION of the throw, and the fraction itself grows with the throw, so a
   * throw twice as long misses by more than twice as much. Doubling is the floor a plain
   * proportional model would hit; anything at or below it means the effort term has been
   * dropped out of the product.
   */
  it('misses by more than double when the throw doubles', () => {
    expect(sigD(midrange, 8)).toBeGreaterThan(2 * sigD(midrange, 4));
  });

  it('is exactly the disc spread away from the unit disc', () => {
    for (const t of DISC_TYPES) {
      expect(sigD(DISCS[t], 4)).toBeCloseTo(sigD(midrange, 4) * DISCS[t].spread, 10);
      expect(sigA(DISCS[t], 4)).toBeCloseTo(sigA(midrange, 4) * DISCS[t].control, 10);
    }
  });
});

describe('flight shape', () => {
  it('takes longer the further the disc goes', () => {
    expect(flightDur(LONG)).toBeGreaterThan(flightDur(SHORT));
  });

  /**
   * The arc is capped, and the cap is live rather than defensive: it engages at 8.75 tiles
   * (~44 m), well inside the drive range, so every long throw shares one ceiling height.
   */
  it('caps the arc height once the throw passes 8.75 tiles', () => {
    expect(flightArc(8.74)).toBeLessThan(3.2);
    expect(flightArc(8.75)).toBeCloseTo(3.2, 6);
    expect(flightArc(LONG)).toBe(3.2);
  });
});

describe('impactSpeed', () => {
  /**
   * Only the along-ground component of the impact carries into the slide, so the descent
   * angle must always bleed something off. If this ever equals the horizontal speed, the
   * projection has been dropped and steep and flat arrivals land identically.
   */
  it('is always slower than the horizontal carry speed', () => {
    for (const d of [SHORT, 3, 5, 8, LONG]) {
      expect(impactSpeed(d)).toBeLessThan(d / flightDur(d));
      expect(impactSpeed(d)).toBeGreaterThan(0);
    }
  });

  it('arrives faster off a longer throw', () => {
    expect(impactSpeed(LONG)).toBeGreaterThan(impactSpeed(SHORT));
  });
});

describe('skidPath on open grass', () => {
  /** Well clear of the water band and the grid edges, so the whole slide is on grass. */
  const grass = { x: 2, y: 2 };

  it('slides with the square of the impact speed, braked by the disc', () => {
    for (const t of DISC_TYPES) {
      const disc = DISCS[t];
      for (const d of [3, 7, LONG]) {
        const v = impactSpeed(d);
        const closedForm = (v * v) / (2 * SKID_DECEL * disc.grip);
        expect(skidPath(grass, 0, d, disc).dist).toBeCloseTo(closedForm, 1);
      }
    }
  });

  /**
   * The wide rim, which is the third thing the disc table buys. Same carry, same arrival
   * speed - the run-out is all rim, and it is the driver's real cost near the basket.
   */
  it('runs a driver out further than a putter off an identical throw', () => {
    const p = skidPath(grass, 0, LONG, putter).dist;
    const mid = skidPath(grass, 0, LONG, midrange).dist;
    const dr = skidPath(grass, 0, LONG, driver).dist;
    expect(p).toBeLessThan(mid);
    expect(mid).toBeLessThan(dr);
    expect(dr / p).toBeGreaterThan(2.5);
  });

  it('runs a full-power throw out around four times as far as a soft one', () => {
    const soft = skidPath(grass, 0, 3, midrange).dist;
    const hard = skidPath(grass, 0, LONG, midrange).dist;
    expect(hard / soft).toBeGreaterThan(4);
  });

  it('samples the slide as a non-decreasing run from zero to the final distance', () => {
    const sk = skidPath(grass, 0, LONG, midrange);
    expect(sk.samples[0]).toBe(0);
    expect(sk.samples.at(-1)).toBeCloseTo(sk.dist, 10);
    for (let i = 1; i < sk.samples.length; i++) {
      expect(sk.samples[i]).toBeGreaterThanOrEqual(sk.samples[i - 1]);
    }
  });

  it('reports a duration matching the samples it took', () => {
    const sk = skidPath(grass, 0, LONG, midrange);
    expect(sk.dur).toBeCloseTo((sk.samples.length - 1) * sk.dt, 10);
  });

  /**
   * skidPath bails out at 600 samples, and a slide that hits the cap is silently cut short
   * rather than reported. Nothing reachable should come near it - including the driver,
   * which slides longest and therefore takes the most steps to stop.
   */
  it('finishes far inside the sample cap, even on the disc that slides longest', () => {
    expect(skidPath(grass, 0, driver.max, driver).samples.length).toBeLessThan(200);
  });
});

describe('skidPath over water', () => {
  /** Heading +y walks down the rows, into the band at ty 6. */
  const intoTheWater = Math.PI / 2;

  /** grip scales grass only. Water stops everything, drivers included. */
  it('kills a full-power slide almost on contact, whatever the disc', () => {
    for (const t of DISC_TYPES) {
      expect(skidPath({ x: 5, y: 6.5 }, intoTheWater, LONG, DISCS[t]).dist).toBeLessThan(0.2);
    }
  });

  /**
   * The reason skidPath integrates instead of using the closed form: a disc that runs off
   * grass into water has to stop just past the shoreline, not glide on across it.
   */
  it('stops a disc that runs off grass into water just past the shoreline', () => {
    const start = { x: 5, y: 5.9 };
    const skid = skidPath(start, intoTheWater, LONG, midrange);
    const restY = start.y + skid.dist;

    expect(restY).toBeGreaterThan(6);
    expect(restY).toBeLessThan(6.3);
    expect(skid.dist).toBeLessThan(skidPath({ x: 2, y: 2 }, intoTheWater, LONG, midrange).dist / 4);
  });
});

describe('restDist', () => {
  it('is the carry plus the slide that follows it', () => {
    const lie = { x: 2, y: 2 };
    const d = 5;
    const landing = { x: lie.x + d, y: lie.y };
    expect(restDist(lie, 0, d, midrange)).toBeCloseTo(
      d + skidPath(landing, 0, d, midrange).dist,
      10,
    );
  });

  it('never falls short of the carry', () => {
    for (const t of DISC_TYPES) {
      for (const d of [SHORT, 5, LONG]) {
        expect(restDist({ x: 2, y: 2 }, 0, d, DISCS[t])).toBeGreaterThanOrEqual(d);
      }
    }
  });
});

/**
 * Carry speed is constant across a flight at d / flightDur(d), and that curve crosses
 * CATCH_SPEED at about 3.8 tiles. So a disc can only ever hole out IN THE AIR from inside
 * ~19 m; anything longer arrives too hot and has to go in off the skid instead. That falls
 * out of the tuning rather than being written anywhere, and it is the kind of thing a
 * change to flightDur would silently move.
 */
describe('the air hole-out ceiling', () => {
  const carrySpeed = (d: number) => d / flightDur(d);

  it('lets a throw from inside 19 m arrive slow enough to stay in', () => {
    expect(carrySpeed(3.7)).toBeLessThan(CATCH_SPEED);
    expect(m(3.7)).toBeLessThan(19);
  });

  it('arrives too hot to stay in from beyond it', () => {
    expect(carrySpeed(3.9)).toBeGreaterThan(CATCH_SPEED);
    expect(carrySpeed(LONG)).toBeGreaterThan(CATCH_SPEED);
  });
});

/**
 * The FOURTH trade-off, which nobody asked the table for. basketEvent tests the skid samples
 * against CATCH_SPEED as well as the carry, so how fast a disc sheds speed on the ground also
 * decides whether it stays in the chains. A putter is under the threshold within a fraction
 * of a tile; a driver is still hot several tiles into its slide.
 *
 * It is the right outcome - it is the putting disc - but it is emergent, and an emergent
 * property nobody wrote down is one refactor away from being "fixed".
 */
describe('grip also decides who sticks in the chains', () => {
  /**
   * basketEvent walks the SKID samples against CATCH_SPEED as well as the carry, so how fast
   * a disc sheds speed on the ground decides whether it stays in the chains - a fourth
   * trade-off falling out of grip, on top of the three the disc table advertises.
   *
   * Identical line, identical carry, basket 1.4 tiles past the landing. The disc enters the
   * cylinder at gap - CATCH_R, so 0.85 tiles into the slide: past the putter's cooling point
   * of 0.58 and still short of its 1.08-tile stop, while the driver is hot until 1.61. The
   * gap is also wider than CATCH_R, so the carry itself never clips the cage and what is
   * under test is purely the slide.
   *
   * It is the right outcome - it is the putting disc - but it is emergent, and an emergent
   * property nobody wrote down is one refactor away from being "fixed".
   */
  const throughTheBasket = (disc: Disc): BasketEvent | null => {
    const carry = 15;
    const gap = 1.4;
    const to = { x: BASKET.x - gap, y: BASKET.y };
    const from = { x: to.x - carry, y: to.y };
    const skid = skidPath(to, 0, carry, disc);
    return basketEvent(
      {
        from,
        to,
        rest: { x: to.x + skid.dist, y: to.y },
        a: 0,
        d: carry,
        t: 0,
        skid,
        skidDur: skid.dur,
        dur: flightDur(carry),
        arc: flightArc(carry),
        h0: 0,
        h1: 0,
        event: null,
      },
      false,
    );
  };

  it('catches a putter skidding through the chains', () => {
    const e = throughTheBasket(putter);
    expect(e).not.toBeNull();
    expect(e!.v).toBeLessThan(CATCH_SPEED);
    expect(e!.caught).toBe(true);
  });

  it('rattles a driver out on the identical line and carry', () => {
    const e = throughTheBasket(driver);
    expect(e).not.toBeNull();
    expect(e!.v).toBeGreaterThan(CATCH_SPEED);
    expect(e!.caught).toBe(false);
  });
});
