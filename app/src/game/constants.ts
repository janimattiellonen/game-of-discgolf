import { rad } from './math';

// ---------------------------------------------------------------- scatter
// Power sets distance AND scatter, so there is no "correct spot" on the bar.
export const SIG_A0 = 3;
export const SIG_A1 = 14; // degrees of angular scatter, at power 0 and 1
export const SIG_D0 = 0.03;
export const SIG_D1 = 0.12; // fraction of throw distance

/**
 * gauss() is unbounded and the overcharge roll multiplies it, so the tail could otherwise
 * put the disc behind you. A shanked disc still goes roughly forward.
 */
export const MAX_ERR_A = rad(40);

// ---------------------------------------------------------------- input
export const TURN_RATE = rad(60); // degrees/s while an arrow is held
export const FINE_TURN = 0.25; // shift multiplier, for the last degree of a putt
export const CHARGE_TIME = 1.2; // seconds from 0 to max power

/**
 * Overcharge: the bar runs 1% past full, and letting it reach 100% blows the throw. The
 * 95-100% band is where the distance is, so the reward for holding on is real and so is
 * the cliff at the end of it. A blown throw still goes, it just goes badly.
 */
export const POWER_MAX = 1.01;

/**
 * How badly you blew it is itself a roll: one severity draw drives all three penalties, so
 * a bust is never free (every range is worse than clean) but ranges from ugly to bad.
 */
export const OVER_A = [1.4, 2.2] as const; // angle scatter multiplier
export const OVER_D = [1.2, 2.0] as const; // distance scatter multiplier
export const OVER_SHORT = [0.85, 0.8] as const; // carry left after a bust: 15-20% gone

// ---------------------------------------------------------------- landing skid
/**
 * A disc still has horizontal speed when it touches down, and kinetic friction bleeds that
 * off at a roughly constant rate. Constant deceleration means the slide length goes with
 * the SQUARE of impact speed: s = v^2 / (2a), t = v / a. That squaring is what makes a hard
 * throw run out so much further than a soft one.
 */
export const SKID_DECEL = 20; // tiles/s^2 on ground
export const WATER_DECEL = 150; // water: a full-power skid dies in ~0.15 tiles

// ---------------------------------------------------------------- holing out
/**
 * The basket is a cylinder: radius CATCH_R, from its own ground up to CATCH_H (the drawn
 * cage top). The disc has to pass THROUGH it, and slowly enough to stay in - a hot disc
 * rattles out. Nothing about carry distance is checked; it falls out of the path.
 */
export const CATCH_R = 0.55; // tiles
export const CATCH_H = 1.7; // units, matches the 34px the basket is drawn at
export const CATCH_SPEED = 6; // tiles/s, faster than this and it bounces out

/**
 * Inside the shortest possible throw (MIN_D) there is no shot to play: any throw
 * overshoots. That range is exactly where the tap-in button belongs.
 */
export const GIMME_R = 1.5;
