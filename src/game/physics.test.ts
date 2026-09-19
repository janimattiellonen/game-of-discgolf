import { describe, expect, it } from 'vitest';
import {
  ARC_BASE,
  ARC_MAX,
  ARC_PER_D,
  CATCH_SPEED,
  DUR_BASE,
  DUR_PER_D,
  SIG_A0,
  SIG_A1,
  SIG_D1,
  SKID_DECEL,
} from './constants';
import { BASKET } from './course';
import type { Disc } from './discs';
import { DISCS, DISC_TYPES, REF_D } from './discs';
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
import { acrossThePowerBar, expectAscending } from '../test-utils';

/** Well clear of the water band and the grid edges, so a whole slide stays on grass. */
const GRASS = { x: 2, y: 2 };

/**
 * Arbitrary tile distances for the tests that just need "a long throw" or "a short one".
 * Deliberately NOT derived from the disc table: the arc saturating at ARC_MAX and water
 * killing a slide inside 0.2 tiles are properties of the physics, not of the driver, and
 * pointing them at DISCS would turn a dozen unrelated tests red on every retune. Where a
 * claim really is about reach - the arc cap landing inside the drive range - the driver is
 * named instead.
 */
const LONG = 11;
const SHORT = 0.8;

const { putter, midrange, driver } = DISCS;

describe('throwDist', () => {
  /** The authored metres are pinned once, in discs.test.ts. Here it is the mapping. */
  it('increases with power, from each disc floor to its ceiling', () => {
    for (const type of DISC_TYPES) {
      const disc = DISCS[type];
      const ds = acrossThePowerBar((p) => throwDist(disc, p));
      expectAscending(ds);
      expect(ds[0]).toBe(disc.min);
      expect(ds.at(-1)).toBe(disc.max);
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
      expectAscending([sigA(putter, carry), sigA(midrange, carry), sigA(driver, carry)]);
      expectAscending([sigD(putter, carry), sigD(midrange, carry), sigD(driver, carry)]);
    }
  });

  it('widens both cones monotonically with the length of the throw', () => {
    for (const type of DISC_TYPES) {
      const disc = DISCS[type];
      expectAscending(acrossThePowerBar((p) => sigA(disc, throwDist(disc, p))));
      expectAscending(acrossThePowerBar((p) => sigD(disc, throwDist(disc, p))));
    }
  });

  /**
   * The unit disc rides the bare curve, so the tuning constants are still readable in it.
   * The bottom of the angular curve is a throw of no length; the top is a throw as long as
   * the yardstick, which is the longest anybody can make.
   */
  it('runs the midrange cone from SIG_A0 to SIG_A1 across the reach of the bag', () => {
    expect(sigA(midrange, 0)).toBeCloseTo(SIG_A0, 10);
    expect(sigA(midrange, REF_D)).toBeCloseTo(SIG_A1, 10);
  });

  it('runs the midrange distance error up to SIG_D1 of the throw', () => {
    expect(sigD(midrange, REF_D)).toBeCloseTo(REF_D * SIG_D1, 10);
  });

  /**
   * sigD is a FRACTION of the throw, and the fraction itself grows with the throw, so a
   * throw twice as long misses by more than twice as much. Doubling is the floor a plain
   * proportional model would hit; at or below it means the effort term has been dropped out
   * of the product.
   */
  it('misses by more than double when the throw doubles', () => {
    expect(sigD(midrange, 8)).toBeGreaterThan(2 * sigD(midrange, 4));
  });

  it('is exactly the disc multiplier away from the unit disc', () => {
    for (const type of DISC_TYPES) {
      expect(sigD(DISCS[type], 4)).toBeCloseTo(sigD(midrange, 4) * DISCS[type].spread, 10);
      expect(sigA(DISCS[type], 4)).toBeCloseTo(sigA(midrange, 4) * DISCS[type].control, 10);
    }
  });
});

describe('flight shape', () => {
  it('charges every throw a floor of hang time plus a cost per tile', () => {
    expect(flightDur(0)).toBeCloseTo(DUR_BASE, 10);
    expect(flightDur(4) - flightDur(3)).toBeCloseTo(DUR_PER_D, 10);
  });

  it('takes longer the further the disc goes', () => {
    expect(flightDur(LONG)).toBeGreaterThan(flightDur(SHORT));
  });

  /**
   * The arc cap is live rather than defensive: it engages well inside the range of the
   * longest disc in the bag, so every long throw shares one ceiling height and only the
   * length separates them.
   */
  it('caps the arc height, and reaches the cap inside the drive range', () => {
    const capReachedAt = (ARC_MAX - ARC_BASE) / ARC_PER_D;

    expect(capReachedAt).toBeLessThan(driver.max);
    expect(flightArc(capReachedAt * 0.99)).toBeLessThan(ARC_MAX);
    expect(flightArc(capReachedAt)).toBeCloseTo(ARC_MAX, 10);
    expect(flightArc(driver.max)).toBe(ARC_MAX);
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
  it('slides with the square of the impact speed, braked by the disc', () => {
    for (const type of DISC_TYPES) {
      const disc = DISCS[type];
      for (const d of [3, 7, LONG]) {
        const v = impactSpeed(d);
        const closedForm = (v * v) / (2 * SKID_DECEL * disc.grip);
        expect(skidPath(GRASS, 0, d, disc).dist).toBeCloseTo(closedForm, 1);
      }
    }
  });

  /**
   * The wide rim, which is the third thing the disc table buys. Same carry, so the same
   * arrival speed - the run-out is all rim, and it is the driver's real cost near the
   * basket.
   */
  it('runs a driver out further than a putter off an identical throw', () => {
    const slides = [putter, midrange, driver].map((d) => skidPath(GRASS, 0, LONG, d).dist);
    expectAscending(slides);
    expect(slides.at(-1)! / slides[0]).toBeGreaterThan(2.5);
  });

  it('runs a full-power throw out around four times as far as a soft one', () => {
    const soft = skidPath(GRASS, 0, 3, midrange).dist;
    const hard = skidPath(GRASS, 0, LONG, midrange).dist;
    expect(hard / soft).toBeGreaterThan(4);
  });

  it('samples the slide as a non-decreasing run from zero to the final distance', () => {
    const sk = skidPath(GRASS, 0, LONG, midrange);
    expect(sk.samples[0]).toBe(0);
    expect(sk.samples.at(-1)).toBeCloseTo(sk.dist, 10);
    expectAscending(sk.samples);
  });

  it('reports a duration matching the samples it took', () => {
    const sk = skidPath(GRASS, 0, LONG, midrange);
    expect(sk.dur).toBeCloseTo((sk.samples.length - 1) * sk.dt, 10);
  });

  /**
   * skidPath bails out at 600 samples, and a slide that hits the cap is silently cut short
   * rather than reported. Nothing reachable should come near it - including the driver at
   * full reach, which slides longest and so takes the most steps to stop.
   */
  it('finishes far inside the sample cap, even on the disc that slides longest', () => {
    expect(skidPath(GRASS, 0, driver.max, driver).samples.length).toBeLessThan(200);
  });
});

describe('skidPath over water', () => {
  /** Heading +y walks down the rows, into the band at ty 6. */
  const intoTheWater = Math.PI / 2;

  /** grip scales grass only. Water stops everything, drivers included. */
  it('kills a full-power slide almost on contact, whatever the disc', () => {
    for (const type of DISC_TYPES) {
      expect(skidPath({ x: 5, y: 6.5 }, intoTheWater, LONG, DISCS[type]).dist).toBeLessThan(0.2);
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
    expect(skid.dist).toBeLessThan(skidPath(GRASS, intoTheWater, LONG, midrange).dist / 4);
  });
});

describe('restDist', () => {
  it('is the carry plus the slide that follows it', () => {
    const d = 5;
    const landing = { x: GRASS.x + d, y: GRASS.y };
    expect(restDist(GRASS, 0, d, midrange)).toBeCloseTo(
      d + skidPath(landing, 0, d, midrange).dist,
      10,
    );
  });

  it('never falls short of the carry', () => {
    for (const type of DISC_TYPES) {
      for (const d of [SHORT, 5, LONG]) {
        expect(restDist(GRASS, 0, d, DISCS[type])).toBeGreaterThanOrEqual(d);
      }
    }
  });
});

/**
 * Carry speed is constant across a flight at d / flightDur(d), and that curve crosses
 * CATCH_SPEED at 3.82 tiles. So a disc can only ever hole out IN THE AIR from inside
 * ~19.1 m; anything longer arrives too hot and has to go in off the skid instead.
 *
 * Nothing sets that ceiling on purpose - it falls out of CATCH_SPEED meeting the hang time
 * curve - so retuning either one moves it with no other symptom. Pinning the crossing
 * itself rather than bracketing it is the point: a bracket wide enough to be safe is also
 * wide enough for the drift to slip through.
 */
describe('the air hole-out ceiling', () => {
  const carrySpeed = (d: number) => d / flightDur(d);
  const crossing = (CATCH_SPEED * DUR_BASE) / (1 - CATCH_SPEED * DUR_PER_D);

  it('sits at 3.82 tiles, a little over 19 m', () => {
    expect(carrySpeed(crossing)).toBeCloseTo(CATCH_SPEED, 10);
    expect(crossing).toBeCloseTo(3.818, 3);
    expect(m(crossing)).toBeCloseTo(19.09, 2);
  });

  it('lets a throw from inside it arrive slow enough to stay in', () => {
    expect(carrySpeed(crossing * 0.999)).toBeLessThan(CATCH_SPEED);
  });

  it('arrives too hot to stay in from beyond it', () => {
    expect(carrySpeed(crossing * 1.001)).toBeGreaterThan(CATCH_SPEED);
    expect(carrySpeed(driver.max)).toBeGreaterThan(CATCH_SPEED);
  });

  /**
   * The bag now interacts with that ceiling, and nobody chose how. A putter and a midrange
   * can both be thrown softly enough to arrive under it; the DRIVER cannot, because its 20 m
   * floor is past the crossing, so a driver can never hole out of the air at any power.
   *
   * The margin is 0.18 tiles - under a metre. Drop the driver's floor to 19 m, or retune
   * CATCH_SPEED or the hang time, and it silently gains an air hole-out it has never had.
   */
  it('is reachable by the putter and midrange, and never by the driver', () => {
    expect(putter.min).toBeLessThan(crossing);
    expect(midrange.min).toBeLessThan(crossing);
    expect(driver.min).toBeGreaterThan(crossing);
  });
});

/**
 * The FOURTH trade-off, which nobody asked the table for. basketEvent walks the SKID samples
 * against CATCH_SPEED as well as the carry, so how fast a disc sheds speed on the ground also
 * decides whether it stays in the chains.
 *
 * It is the right outcome - it is the putting disc - but it is emergent, and an emergent
 * property nobody wrote down is one refactor away from being "fixed".
 */
describe('grip also decides who sticks in the chains', () => {
  /**
   * Identical line, identical carry, basket 1.4 tiles past the landing. The disc enters the
   * cylinder at gap - CATCH_R, so 0.85 tiles into the slide: past the putter's cooling point
   * of 0.58 and still short of its 1.08-tile stop, while the driver is hot until 1.61. The
   * gap is also wider than CATCH_R, so the carry itself never clips the cage and what is
   * under test is purely the slide.
   */
  const throughTheBasket = (disc: Disc): BasketEvent | null => {
    const carry = 15;
    const gap = 1.4;
    const to = { x: BASKET.x - gap, y: BASKET.y };
    const skid = skidPath(to, 0, carry, disc);
    return basketEvent(
      {
        from: { x: to.x - carry, y: to.y },
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

  /**
   * The whole bag, not just its ends. The midrange is on the wrong side of CATCH_SPEED here
   * too - it cools at 0.89 tiles and the cylinder starts at 0.85 - so what this pins is the
   * ORDERING, which is the claim, rather than a catch verdict that would be an accident of
   * this one gap.
   */
  it('orders arrival speed at the chains putter < midrange < driver', () => {
    const speeds = [putter, midrange, driver].map((d) => throughTheBasket(d)!.v);
    expectAscending(speeds);
    expect(new Set(speeds).size).toBe(3);
  });
});
