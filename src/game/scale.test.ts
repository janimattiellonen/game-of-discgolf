import { describe, expect, it } from 'vitest';
import { CLASSES, classOf, m, tl } from './scale';
import { expectAscending } from '../test-utils';

describe('tile <-> metre conversion', () => {
  it('round-trips a tile distance through metres unchanged', () => {
    expect(tl(m(3.7))).toBeCloseTo(3.7, 10);
  });

  it('measures one tile as TILE_M metres', () => {
    expect(m(1)).toBe(5);
    expect(tl(5)).toBe(1);
  });
});

describe('classOf', () => {
  /**
   * classOf picks the FIRST band whose max it fits under, so the whole thing is only
   * correct while CLASSES stays sorted. Reordering the array silently returns the wrong
   * class rather than failing, which is what this test is here to catch.
   */
  it('keeps the class bands in ascending order', () => {
    expectAscending(CLASSES.map((c) => c.max));
  });

  it('includes the upper bound in the band below it', () => {
    expect(classOf(60)).toBe('beginner');
    expect(classOf(85)).toBe('recreational');
    expect(classOf(110)).toBe('intermediate');
    expect(classOf(140)).toBe('advanced');
  });

  it('moves up a class just past the bound', () => {
    expect(classOf(60.01)).toBe('recreational');
    expect(classOf(85.01)).toBe('intermediate');
    expect(classOf(110.01)).toBe('advanced');
    expect(classOf(140.01)).toBe('pro');
  });

  it('has no upper limit on pro', () => {
    expect(classOf(500)).toBe('pro');
  });

  it('classifies a zero-length hole as beginner', () => {
    expect(classOf(0)).toBe('beginner');
  });
});
