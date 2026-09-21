import { describe, expect, it } from 'vitest';
import { AUTO_TAP_R, GIMME_R } from './constants';
import { BASKET } from './course';
import { createState, pressSpace } from './sim';
import type { AimMode, GameState } from './types';

/** A state at rest, `d` tiles short of the basket along the x axis. */
function lying(d: number, mode: AimMode = 'manual'): GameState {
  const s = createState();
  s.mode = mode;
  s.lie = { x: BASKET.x - d, y: BASKET.y };
  return s;
}

describe('pressSpace inside the basket circle', () => {
  it('holes out instead of charging, in manual mode', () => {
    const s = lying(AUTO_TAP_R * 0.5);

    pressSpace(s, false);

    expect(s.phase).toBe('done');
    expect(s.throws).toBe(1);
  });

  it('holes out in timing mode too, without running the direction sweep', () => {
    const s = lying(AUTO_TAP_R * 0.5, 'timing');

    pressSpace(s, false);

    expect(s.phase).toBe('done');
  });

  it('charges as usual one hair outside the circle', () => {
    const s = lying(AUTO_TAP_R * 1.01);

    pressSpace(s, false);

    expect(s.phase).toBe('power');
    expect(s.throws).toBe(0);
  });

  it('holes out from the inside edge of the circle', () => {
    const s = lying(AUTO_TAP_R * 0.999);

    pressSpace(s, false);

    expect(s.phase).toBe('done');
  });

  it('ignores key repeat once the hole is done', () => {
    const s = lying(AUTO_TAP_R * 0.5);

    pressSpace(s, false);
    pressSpace(s, true);

    expect(s.throws).toBe(1);
  });

  it('does not fire while a disc is in the air over the basket', () => {
    const s = lying(AUTO_TAP_R * 0.5);
    s.phase = 'flying';

    pressSpace(s, false);

    expect(s.phase).toBe('flying');
    expect(s.throws).toBe(0);
  });
});

describe('the two tap-in circles', () => {
  /**
   * The automatic rule has to sit inside the allowed one, or space would hole out from a
   * range where `tapIn()` refuses and the press would silently do nothing. The bag already
   * moved GIMME_R once for reasons of its own; this is what catches the next move.
   */
  it('keeps the automatic circle inside the one the button allows', () => {
    expect(AUTO_TAP_R).toBeLessThan(GIMME_R);
  });
});
