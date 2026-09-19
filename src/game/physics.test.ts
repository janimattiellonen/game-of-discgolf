import { describe, expect, it } from 'vitest';
import { CATCH_SPEED, SKID_DECEL } from './constants';
import { MAX_D, MIN_D } from './course';
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

/** Sample a tuning curve across the power bar. */
const overPower = (n = 21) => Array.from({ length: n }, (_, i) => i / (n - 1));

describe('throwDist', () => {
  it('spans the player arm from a putt at rest to a drive at full power', () => {
    expect(m(throwDist(0))).toBeCloseTo(7.5, 6);
    expect(m(throwDist(1))).toBeCloseTo(55, 6);
  });

  it('increases with power', () => {
    const ds = overPower().map(throwDist);
    expect(ds).toEqual([...ds].sort((a, b) => a - b));
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
    const sigs = overPower().map(sigA);
    expect(sigs).toEqual([...sigs].sort((a, b) => a - b));
    expect(sigA(0)).toBeCloseTo(3, 6);
    expect(sigA(1)).toBeCloseTo(14, 6);
  });

  it('widens the distance error monotonically with power', () => {
    const sigs = overPower().map((p) => sigD(p, throwDist(p)));
    expect(sigs).toEqual([...sigs].sort((a, b) => a - b));
  });

  it('scales the distance error with the length of the throw', () => {
    expect(sigD(0, 10)).toBeCloseTo(0.3, 6);
    expect(sigD(1, 10)).toBeCloseTo(1.2, 6);
    expect(sigD(0.5, 20)).toBeCloseTo(2 * sigD(0.5, 10), 6);
  });
});

describe('flight shape', () => {
  it('takes longer the further the disc goes', () => {
    expect(flightDur(MAX_D)).toBeGreaterThan(flightDur(MIN_D));
  });

  /**
   * The arc is capped, and the cap is live rather than defensive: it engages at 8.75 tiles
   * (~44 m), well inside the drive range, so every long throw shares one ceiling height.
   */
  it('caps the arc height once the throw passes 8.75 tiles', () => {
    expect(flightArc(8.74)).toBeLessThan(3.2);
    expect(flightArc(8.75)).toBeCloseTo(3.2, 6);
    expect(flightArc(MAX_D)).toBe(3.2);
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
  /** Well clear of the water band and the grid edges, so the whole slide is on grass. */
  const grass = { x: 2, y: 2 };

  it('slides with the square of the impact speed', () => {
    for (const d of [3, 7, MAX_D]) {
      const v = impactSpeed(d);
      const closedForm = (v * v) / (2 * SKID_DECEL);
      expect(skidPath(grass, 0, d).dist).toBeCloseTo(closedForm, 1);
    }
  });

  it('runs a full-power throw out around four times as far as a soft one', () => {
    const soft = skidPath(grass, 0, 3).dist;
    const hard = skidPath(grass, 0, MAX_D).dist;
    expect(hard / soft).toBeGreaterThan(4);
  });

  it('samples the slide as a non-decreasing run from zero to the final distance', () => {
    const sk = skidPath(grass, 0, MAX_D);
    expect(sk.samples[0]).toBe(0);
    expect(sk.samples.at(-1)).toBeCloseTo(sk.dist, 10);
    for (let i = 1; i < sk.samples.length; i++) {
      expect(sk.samples[i]).toBeGreaterThanOrEqual(sk.samples[i - 1]);
    }
  });

  it('reports a duration matching the samples it took', () => {
    const sk = skidPath(grass, 0, MAX_D);
    expect(sk.dur).toBeCloseTo((sk.samples.length - 1) * sk.dt, 10);
  });

  /**
   * skidPath bails out at 600 samples, and a slide that hits the cap is silently cut short
   * rather than reported. Nothing reachable should come near it.
   */
  it('finishes far inside the sample cap', () => {
    expect(skidPath(grass, 0, MAX_D).samples.length).toBeLessThan(100);
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
    expect(skid.dist).toBeLessThan(skidPath({ x: 2, y: 2 }, intoTheWater, MAX_D).dist / 4);
  });
});

describe('restDist', () => {
  it('is the carry plus the slide that follows it', () => {
    const lie = { x: 2, y: 2 };
    const d = 5;
    const landing = { x: lie.x + d, y: lie.y };
    expect(restDist(lie, 0, d)).toBeCloseTo(d + skidPath(landing, 0, d).dist, 10);
  });

  it('never falls short of the carry', () => {
    for (const d of [MIN_D, 5, MAX_D]) {
      expect(restDist({ x: 2, y: 2 }, 0, d)).toBeGreaterThanOrEqual(d);
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
    expect(carrySpeed(MAX_D)).toBeGreaterThan(CATCH_SPEED);
  });
});
