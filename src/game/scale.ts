/**
 * Everything in the model is measured in TILES and every distance is Euclidean, so one
 * tile is TILE_M across its sides and TILE_M * sqrt(2) corner to corner. This single
 * constant is what turns the board into a real course: change it and every throw, ring
 * and hole length is rescaled with it.
 *
 * Metres are a DISPLAY unit only. Converting the model itself would just add rounding
 * noise to the physics.
 */
export const TILE_M = 5;
export const TILE_DIAG_M = TILE_M * Math.SQRT2;

/** tiles -> metres */
export const m = (tiles: number) => tiles * TILE_M;
/** metres -> tiles */
export const tl = (metres: number) => metres / TILE_M;

export type CourseClass = 'beginner' | 'recreational' | 'intermediate' | 'advanced' | 'pro';

/**
 * Real courses are graded by their AVERAGE hole length. These are the usual bands:
 * beginner layouts sit under 60 m, elite layouts average north of 140 m.
 */
export const CLASSES: { name: CourseClass; max: number }[] = [
  { name: 'beginner', max: 60 },
  { name: 'recreational', max: 85 },
  { name: 'intermediate', max: 110 },
  { name: 'advanced', max: 140 },
  { name: 'pro', max: Infinity },
];

export const classOf = (metres: number): CourseClass => CLASSES.find((c) => metres <= c.max)!.name;
