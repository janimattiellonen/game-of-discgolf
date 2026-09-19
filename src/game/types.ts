import type { DiscType } from './discs';

export interface Vec {
  x: number;
  y: number;
}

/** idle doubles as the aiming phase in manual mode and the waiting phase in timing mode. */
export type Phase = 'idle' | 'dir' | 'power' | 'flying' | 'done';

export type AimMode = 'manual' | 'timing';

export interface SkidPath {
  /** total slide length in tiles */
  dist: number;
  /** how long the slide takes in seconds */
  dur: number;
  /** distance slid at each fixed timestep */
  samples: number[];
  dt: number;
}

export interface BasketEvent {
  /** time into the flight at which the disc is inside the basket cylinder */
  t: number;
  pos: Vec;
  /** speed carried at that moment, tiles/s */
  v: number;
  caught: boolean;
}

export interface Flight {
  from: Vec;
  to: Vec;
  /** where the disc stops, after the skid */
  rest: Vec;
  /** heading */
  a: number;
  /** carry distance in tiles */
  d: number;
  /** elapsed time */
  t: number;
  skid: SkidPath;
  skidDur: number;
  dur: number;
  arc: number;
  h0: number;
  h1: number;
  event: BasketEvent | null;
}

/** Q2 aids. Turning them off is the test of whether the isometric view reads on its own. */
export interface Toggles {
  cone: boolean;
  shadow: boolean;
  rings: boolean;
  elev: boolean;
}

export interface GameState {
  phase: Phase;
  mode: AimMode;
  /** the disc in hand. Unlike mode and toggles, reset() puts this back to the driver. */
  disc: DiscType;
  lie: Vec;
  prevLie: Vec;
  throws: number;
  penalties: number;
  /** sweep clock, timing mode only */
  t: number;
  angle: number;
  power: number;
  lockedAngle: number;
  flight: Flight | null;
  lastErr: string;
  log: string[];
  held: { left: boolean; right: boolean };
  /** shift held: fine aim */
  fine: boolean;
  toggles: Toggles;
}
