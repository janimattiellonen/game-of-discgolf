import { describe, expect, it } from 'vitest';
import {
  BASKET,
  GH,
  GW,
  TEE,
  TEE_H,
  groundAt,
  heightAt,
  holeLength,
  inGrid,
  isTee,
  isWater,
} from './course';
import { DISCS } from './discs';
import { classOf, tl } from './scale';

describe('holeLength', () => {
  it('measures the straight line from the tee pad to the basket', () => {
    expect(holeLength()).toBeCloseTo(83.2, 1);
  });

  /**
   * This is the number the player is told on the opening line and reads off the panel all
   * the way round, and it sits only 1.8 m under the 85 m recreational bound - close enough
   * that nudging the tee or the basket a single tile would re-grade the hole.
   */
  it('grades the hole as recreational', () => {
    expect(classOf(holeLength())).toBe('recreational');
  });

  /**
   * The hole's entire design premise: the pin cannot be reached off the tee, so the water is
   * a decision rather than a formality. The margin used to be 28 m against a 55 m arm and is
   * now 8 m against the driver - still out of reach, but this is the assertion that should
   * fail loudly the day somebody bumps the driver to 85 m.
   *
   * Simulated against the three-disc model, a full-power driver at the pin drowns 52% of the
   * time for a 1.8% tap-in rate, so the greedy line is worse than it was, not better.
   */
  it('is out of reach of the longest disc in the bag', () => {
    expect(tl(holeLength())).toBeGreaterThan(DISCS.driver.max);
  });
});

describe('isWater', () => {
  it('covers exactly the two rows of the band', () => {
    expect(isWater(5, 5)).toBe(false);
    expect(isWater(5, 6)).toBe(true);
    expect(isWater(5, 7)).toBe(true);
    expect(isWater(5, 8)).toBe(false);
  });

  /**
   * The land bridge on the right is the whole hole: the direct line from the tee crosses
   * the water, and the dry way round costs a throw. If this ever closes, the route dilemma
   * the hole is built around quietly stops existing.
   */
  it('leaves a dry bridge along the right-hand edge', () => {
    expect(isWater(14, 6)).toBe(true);
    expect(isWater(15, 6)).toBe(false);

    for (let ty = 6; ty <= 7; ty++) {
      for (let tx = 15; tx < GW; tx++) {
        expect(isWater(tx, ty)).toBe(false);
      }
    }
  });

  it('puts the water across the direct line from the tee to the basket', () => {
    const t = (6.5 - TEE.y) / (BASKET.y - TEE.y);
    const x = TEE.x + (BASKET.x - TEE.x) * t;
    expect(isWater(x | 0, 6)).toBe(true);
  });
});

describe('inGrid', () => {
  it('includes the first tile and excludes the one past the last', () => {
    expect(inGrid(0, 0)).toBe(true);
    expect(inGrid(GW - 1, GH - 1)).toBe(true);
    expect(inGrid(GW, 0)).toBe(false);
    expect(inGrid(0, GH)).toBe(false);
  });

  it('excludes negative tiles', () => {
    expect(inGrid(-1, 0)).toBe(false);
    expect(inGrid(0, -1)).toBe(false);
  });
});

describe('heightAt', () => {
  it('raises the plateau over the top four rows', () => {
    expect(heightAt(10, 3)).toBe(3);
    expect(heightAt(10, 4)).toBe(0);
  });

  it('stands the basket on the plateau', () => {
    expect(heightAt(BASKET.x | 0, BASKET.y | 0)).toBe(3);
  });

  it('gives the tee pad its lip and nothing else', () => {
    expect(heightAt(TEE.x | 0, TEE.y | 0)).toBe(TEE_H);
    expect(heightAt((TEE.x | 0) + 1, TEE.y | 0)).toBe(0);
  });
});

describe('isTee', () => {
  it('matches the tile the tee pad sits in', () => {
    expect(isTee(TEE.x | 0, TEE.y | 0)).toBe(true);
    expect(isTee((TEE.x | 0) + 1, TEE.y | 0)).toBe(false);
  });
});

describe('groundAt', () => {
  it('reads the height under a continuous point', () => {
    expect(groundAt(BASKET.x, BASKET.y, true)).toBe(3);
  });

  it('flattens the whole course when elevation is off', () => {
    expect(groundAt(BASKET.x, BASKET.y, false)).toBe(0);
  });

  it('treats anything off the grid as flat ground', () => {
    expect(groundAt(-5, -5, true)).toBe(0);
    expect(groundAt(GW + 5, 2, true)).toBe(0);
  });
});
