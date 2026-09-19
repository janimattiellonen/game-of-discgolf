import { rad } from './math';

// ---------------------------------------------------------------- scatter
/**
 * Power sets distance AND scatter, so there is no "correct spot" on the bar.
 *
 * That invariant is WEAKER now than it was, and deliberately so. Scatter is keyed to the
 * distance of the throw rather than to the bar (see effort() in discs.ts), so a short disc
 * spans a short stretch of this curve: a putter's whole bar runs 2.3 deg to 4.3 deg where a
 * driver's runs 7.4 to 17.5. Risk lives primarily in WHICH DISC you pull now, and only
 * secondarily in how hard you throw it; on a putter the last real gamble on the bar is the
 * overcharge cliff.
 *
 * What the simulation then found is that the course puts the choice back: a driver at 80%
 * power drowns about 30% of tee shots against about 52% at full power, and taps in more
 * often. The bar still has a wrong end - the water decides it rather than this curve.
 * Re-derive with `pnpm sim`.
 */
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

/**
 * The flier. Maximum distance is soft, and soft UPWARDS only: roughly one clean throw in
 * twelve gets away and carries 5-15% further than it should.
 *
 * sigD already lets a throw land long, but it is the constant hum of imprecision - the flier
 * is the rare, nameable one the player tells a story about, which is why it is announced in
 * the log rather than left to look like a bug.
 */
export const FLIER_P = 0.08;
export const FLIER_GAIN = [1.05, 1.15] as const;

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
 * Inside the shortest possible throw there is no shot to play: any throw overshoots. That
 * range is exactly where the tap-in button belongs.
 *
 * This is PAIRED WITH DISCS.putter.min and discs.test.ts asserts they stay equal. Move one
 * without the other and you open a band with no legal shot in it - too far to tap in, closer
 * than the softest disc in the bag can throw - where the player is forced to overshoot into
 * the circle and tap in from there, paying a stroke they can neither avoid nor explain.
 *
 * It used to be 7.5 m, equal to the old MIN_D by coincidence of two unrelated constants. A
 * bag breaks that coincidence, so both ends moved down together: at 4 m the 5-7 m putt is a
 * shot the player stands over, which is what makes the putter a disc rather than a label.
 */
export const GIMME_R = 0.8;
