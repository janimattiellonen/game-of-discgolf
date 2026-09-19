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
  SIG_D0,
  SIG_D1,
  SKID_DECEL,
} from './constants';
import { DRIVE_M, MAX_D, MIN_D, PUTT_M } from './course';
import {
  flightArc,
  flightDur,
  impactSpeed,
  restDist,
  sigA,
  sigD,
  skidPath,
  throwDist,
} from './physics';
import { m } from './scale';
import { acrossThePowerBar, expectAscending } from './testing';

/** Well clear of the water band and the grid edges, so a whole slide stays on grass. */
const GRASS = { x: 2, y: 2 };

describe('throwDist', () => {
  it('spans the player arm from a putt at rest to a drive at full power', () => {
    expect(m(throwDist(0))).toBeCloseTo(PUTT_M, 6);
    expect(m(throwDist(1))).toBeCloseTo(DRIVE_M, 6);
  });

  it('increases with power', () => {
    const ds = acrossThePowerBar(throwDist);
    expectAscending(ds);
    expect(ds[0]).toBe(MIN_D);
    expect(ds.at(-1)).toBe(MAX_D);
  });
});

/**
 * Power buys distance AND scatter, which is the reason there is no correct spot on the
 * bar. That design claim only holds while both curves rise the whole way across, so it is
 * worth asserting as a property rather than spot-checking the formula.
 */
describe('scatter', () => {
  it('widens the angular cone monotonically with power', () => {
    expectAscending(acrossThePowerBar(sigA));
  });

  it('widens the distance error monotonically with power', () => {
    expectAscending(acrossThePowerBar((p) => sigD(p, throwDist(p))));
  });

  /** The curves run between the tuning constants themselves, with nothing added on top. */
  it('runs the cone from SIG_A0 to SIG_A1 across the bar', () => {
    expect(sigA(0)).toBeCloseTo(SIG_A0, 10);
    expect(sigA(1)).toBeCloseTo(SIG_A1, 10);
  });

  it('runs the distance error from SIG_D0 to SIG_D1 of the throw', () => {
    expect(sigD(0, 10)).toBeCloseTo(10 * SIG_D0, 10);
    expect(sigD(1, 10)).toBeCloseTo(10 * SIG_D1, 10);
  });

  it('scales the distance error with the length of the throw', () => {
    expect(sigD(0.5, 20)).toBeCloseTo(2 * sigD(0.5, 10), 10);
  });
});

describe('flight shape', () => {
  it('charges every throw a floor of hang time plus a cost per tile', () => {
    expect(flightDur(0)).toBeCloseTo(DUR_BASE, 10);
    expect(flightDur(4) - flightDur(3)).toBeCloseTo(DUR_PER_D, 10);
  });

  it('takes longer the further the disc goes', () => {
    expect(flightDur(MAX_D)).toBeGreaterThan(flightDur(MIN_D));
  });

  /**
   * The arc cap is live rather than defensive: it engages well inside the drive range, so
   * every long throw shares one ceiling height and only the length separates them.
   */
  it('caps the arc height, and reaches the cap inside the drive range', () => {
    const capReachedAt = (ARC_MAX - ARC_BASE) / ARC_PER_D;

    expect(capReachedAt).toBeLessThan(MAX_D);
    expect(flightArc(capReachedAt * 0.99)).toBeLessThan(ARC_MAX);
    expect(flightArc(capReachedAt)).toBeCloseTo(ARC_MAX, 10);
    expect(flightArc(MAX_D)).toBe(ARC_MAX);
  });
});

describe('impactSpeed', () => {
  /**
   * Only the along-ground component of the impact carries into the slide, so the descent
   * angle must always bleed something off. If this ever equals the horizontal speed, the
   * projection has been dropped and steep and flat arrivals land identically.
   */
  it('is always slower than the horizontal carry speed', () => {
    for (const d of [MIN_D, 3, 5, 8, MAX_D]) {
      expect(impactSpeed(d)).toBeLessThan(d / flightDur(d));
      expect(impactSpeed(d)).toBeGreaterThan(0);
    }
  });

  it('arrives faster off a longer throw', () => {
    expect(impactSpeed(MAX_D)).toBeGreaterThan(impactSpeed(MIN_D));
  });
});

describe('skidPath on open grass', () => {
  it('slides with the square of the impact speed', () => {
    for (const d of [3, 7, MAX_D]) {
      const v = impactSpeed(d);
      const closedForm = (v * v) / (2 * SKID_DECEL);
      expect(skidPath(GRASS, 0, d).dist).toBeCloseTo(closedForm, 1);
    }
  });

  it('runs a full-power throw out around four times as far as a soft one', () => {
    const soft = skidPath(GRASS, 0, 3).dist;
    const hard = skidPath(GRASS, 0, MAX_D).dist;
    expect(hard / soft).toBeGreaterThan(4);
  });

  it('samples the slide as a non-decreasing run from zero to the final distance', () => {
    const sk = skidPath(GRASS, 0, MAX_D);
    expect(sk.samples[0]).toBe(0);
    expect(sk.samples.at(-1)).toBeCloseTo(sk.dist, 10);
    expectAscending(sk.samples);
  });

  it('reports a duration matching the samples it took', () => {
    const sk = skidPath(GRASS, 0, MAX_D);
    expect(sk.dur).toBeCloseTo((sk.samples.length - 1) * sk.dt, 10);
  });

  /**
   * skidPath bails out at 600 samples, and a slide that hits the cap is silently cut short
   * rather than reported. Nothing reachable should come near it.
   */
  it('finishes far inside the sample cap', () => {
    expect(skidPath(GRASS, 0, MAX_D).samples.length).toBeLessThan(100);
  });
});

describe('skidPath over water', () => {
  /** Heading +y walks down the rows, into the band at ty 6. */
  const intoTheWater = Math.PI / 2;

  it('kills a full-power slide almost on contact', () => {
    expect(skidPath({ x: 5, y: 6.5 }, intoTheWater, MAX_D).dist).toBeLessThan(0.2);
  });

  /**
   * The reason skidPath integrates instead of using the closed form: a disc that runs off
   * grass into water has to stop just past the shoreline, not glide on across it.
   */
  it('stops a disc that runs off grass into water just past the shoreline', () => {
    const start = { x: 5, y: 5.9 };
    const skid = skidPath(start, intoTheWater, MAX_D);
    const restY = start.y + skid.dist;

    expect(restY).toBeGreaterThan(6);
    expect(restY).toBeLessThan(6.3);
    expect(skid.dist).toBeLessThan(skidPath(GRASS, intoTheWater, MAX_D).dist / 4);
  });
});

describe('restDist', () => {
  it('is the carry plus the slide that follows it', () => {
    const d = 5;
    const landing = { x: GRASS.x + d, y: GRASS.y };
    expect(restDist(GRASS, 0, d)).toBeCloseTo(d + skidPath(landing, 0, d).dist, 10);
  });

  it('never falls short of the carry', () => {
    for (const d of [MIN_D, 5, MAX_D]) {
      expect(restDist(GRASS, 0, d)).toBeGreaterThanOrEqual(d);
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
    expect(carrySpeed(MAX_D)).toBeGreaterThan(CATCH_SPEED);
  });
});
