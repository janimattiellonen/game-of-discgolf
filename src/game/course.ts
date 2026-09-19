import { m } from './scale';
import type { Vec } from './types';

/**
 * The single hole the prototype plays. Making grid, tee, basket and terrain per-hole data
 * is the next step (see specs/2026-09-19-course-measurement-and-hole-classification.md) -
 * it is what the upper course classes need, because a 130 m drive is 26 tiles and this
 * board is only 20 wide.
 */
export const GW = 20;
export const GH = 14;

export const TEE: Vec = { x: 2.5, y: 11.5 };
export const BASKET: Vec = { x: 16.5, y: 2.5 };
export const PAR = 3;

/** Straight line tee pad to basket, the way a hole's length is published. */
export const holeLength = () => m(Math.hypot(BASKET.x - TEE.x, BASKET.y - TEE.y));

/**
 * Water band with a land bridge on the right: the direct line crosses it, going around
 * costs a throw. That is the route dilemma under test.
 */
export const isWater = (tx: number, ty: number) => ty >= 6 && ty <= 7 && tx <= 14;

export const isTee = (tx: number, ty: number) => tx === (TEE.x | 0) && ty === (TEE.y | 0);

/** A low lip on the tee pad, ~4px at HZ=20. */
export const TEE_H = 0.2;

/** Raised plateau around the basket, 3 blocks up. */
export const heightAt = (tx: number, ty: number) => (ty <= 3 ? 3 : isTee(tx, ty) ? TEE_H : 0);

export const inGrid = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < GW && ty < GH;

/**
 * Ground height under a continuous point, matching what the disc marker uses. Without it
 * the aim line would sit at h=0 while the disc sits on the plateau.
 */
export const groundAt = (x: number, y: number, elev: boolean) =>
  elev && inGrid(x | 0, y | 0) ? heightAt(x | 0, y | 0) : 0;

/**
 * There is no arm constant here any more. How far the player throws is a property of the
 * DISC now (see discs.ts), not of the course, and nothing in this file should know a throw
 * distance. When player skill arrives it will scale the disc table, not reappear here.
 *
 * What the hole is worth knowing for: the pin sits 83 m out, beyond every disc in the bag,
 * which is what makes the water a decision rather than a formality. Re-measured against the
 * three-disc model, a full-power driver at the pin drowns 52% of the time for a 1.8% tap-in
 * rate, so the greedy line is worse than it was, not better. course.test.ts guards it.
 */
