import { BASKET, PAR, holeLength } from './course';
import type { DiscType } from './discs';
import { DISCS, DISC_KEYS, DISC_TYPES } from './discs';
import { dist } from './math';
import { sigA, sigD, throwDist } from './physics';
import { render } from './render';
import { classOf, m } from './scale';
import {
  cancel,
  canTapIn,
  createState,
  pressSpace,
  releaseSpace,
  reset,
  setDisc,
  setMode,
  step,
  tapIn,
} from './sim';
import type { AimMode, GameState, Phase, Toggles } from './types';

/**
 * What the UI is allowed to see. Everything here is a plain value, so a React panel can
 * render it without ever touching game state.
 */
export interface Snapshot {
  phase: Phase;
  mode: AimMode;
  /**
   * Which disc is in hand - the only part of it that changes. The table itself is static and
   * is re-exported below for the picker to read, rather than republished at 10Hz.
   */
  disc: DiscType;
  holeMetres: number;
  holeClass: string;
  par: number;
  throws: number;
  penalties: number;
  /** metres from the lie to the basket */
  distance: number;
  /** null unless a power bar is running */
  power: number | null;
  throwMetres: number | null;
  sigAngle: number | null;
  sigDistance: number | null;
  lastErr: string;
  log: string[];
  canTapIn: boolean;
  toggles: Toggles;
}

function snapshot(s: GameState): Snapshot {
  const disc = DISCS[s.disc];
  const p = s.phase === 'power' ? s.power : null;
  const hole = holeLength();
  return {
    phase: s.phase,
    mode: s.mode,
    disc: s.disc,
    holeMetres: hole,
    holeClass: classOf(hole),
    par: PAR,
    throws: s.throws,
    penalties: s.penalties,
    distance: m(dist(s.lie, BASKET)),
    power: p,
    throwMetres: p === null ? null : m(throwDist(disc, p)),
    sigAngle: p === null ? null : sigA(disc, throwDist(disc, p)),
    sigDistance: p === null ? null : m(sigD(disc, throwDist(disc, p))),
    lastErr: s.lastErr,
    log: s.log,
    canTapIn: canTapIn(s),
    toggles: { ...s.toggles },
  };
}

export interface Game {
  /** Live state. The renderer reads this every frame; the UI should use subscribe(). */
  readonly state: GameState;
  start(): void;
  stop(): void;
  subscribe(fn: (s: Snapshot) => void): () => void;
  /** Binds keyboard input to a target (defaults to window). Returns an unbind. */
  bindKeys(target?: EventTarget): () => void;
  reset(): void;
  tapIn(): void;
  setMode(mode: AimMode): void;
  setDisc(disc: DiscType): void;
  toggle(aid: keyof Toggles): void;
}

/**
 * The whole game, driven by a canvas and nothing else. No framework is involved: React (or
 * anything else) hands it a canvas, calls start(), and subscribes for panel updates.
 */
export function createGame(canvas: HTMLCanvasElement): Game {
  const cx = canvas.getContext('2d');
  if (!cx) throw new Error('2d canvas context unavailable');

  const state = createState();
  const listeners = new Set<(s: Snapshot) => void>();
  let raf = 0;
  let last = 0;
  let nextPublish = 0;
  let lastPhase: Phase = state.phase;

  /**
   * The loop runs at 60fps but the panel does not need to. Publishing on phase changes
   * plus ~10Hz keeps React out of the frame budget - the live power bar is drawn on the
   * canvas, where it costs nothing.
   */
  function publish(now: number, force = false) {
    if (!force && state.phase === lastPhase && now < nextPublish) return;
    lastPhase = state.phase;
    nextPublish = now + 100;
    const snap = snapshot(state);
    for (const fn of listeners) fn(snap);
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(state, dt);
    render(cx!, state, canvas.width, canvas.height);
    publish(now);
    raf = requestAnimationFrame(frame);
  }

  return {
    state,

    start() {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },

    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },

    subscribe(fn) {
      listeners.add(fn);
      fn(snapshot(state));
      return () => listeners.delete(fn);
    },

    bindKeys(target: EventTarget = window) {
      const onKeyDown = (ev: Event) => {
        const e = ev as KeyboardEvent;
        state.fine = e.shiftKey;
        if (e.code === 'KeyR') {
          reset(state);
          publish(performance.now(), true);
          return;
        }
        // Above the manual-mode branch below, which ends in a return - anything after it
        // would be a dead key in the mode most people play.
        for (const type of DISC_TYPES) {
          if (e.code === `Key${DISC_KEYS[type]}`) setDisc(state, type);
        }
        if (e.code === 'Digit1') state.toggles.cone = !state.toggles.cone;
        if (e.code === 'Digit2') state.toggles.shadow = !state.toggles.shadow;
        if (e.code === 'Digit3') state.toggles.rings = !state.toggles.rings;
        if (e.code === 'Digit4') state.toggles.elev = !state.toggles.elev;
        if (e.code === 'Escape') {
          cancel(state);
          return;
        }
        if (state.mode === 'manual') {
          if (e.code === 'ArrowLeft') {
            state.held.left = true;
            e.preventDefault();
          }
          if (e.code === 'ArrowRight') {
            state.held.right = true;
            e.preventDefault();
          }
          if (e.code === 'Space') {
            e.preventDefault(); // held space must not scroll the page
            pressSpace(state, e.repeat);
          }
          return;
        }
        if (e.code !== 'Space') return;
        e.preventDefault();
        pressSpace(state, e.repeat);
      };

      const onKeyUp = (ev: Event) => {
        const e = ev as KeyboardEvent;
        state.fine = e.shiftKey;
        if (e.code === 'ArrowLeft') state.held.left = false;
        if (e.code === 'ArrowRight') state.held.right = false;
        if (e.code === 'Space') releaseSpace(state);
      };

      target.addEventListener('keydown', onKeyDown);
      target.addEventListener('keyup', onKeyUp);
      return () => {
        target.removeEventListener('keydown', onKeyDown);
        target.removeEventListener('keyup', onKeyUp);
        state.held.left = false;
        state.held.right = false;
      };
    },

    reset() {
      reset(state);
      publish(performance.now(), true);
    },

    tapIn() {
      tapIn(state);
      publish(performance.now(), true);
    },

    setMode(mode) {
      setMode(state, mode);
      publish(performance.now(), true);
    },

    setDisc(disc) {
      setDisc(state, disc);
      publish(performance.now(), true);
    },

    toggle(aid) {
      state.toggles[aid] = !state.toggles[aid];
      publish(performance.now(), true);
    },
  };
}

export type { AimMode, GameState, Phase, Toggles } from './types';
export type { Disc, DiscType } from './discs';
/** The disc table is static, so the picker reads it directly instead of via the Snapshot. */
export { DISCS, DISC_KEYS, DISC_TYPES } from './discs';
export { TILE_M, TILE_DIAG_M, m } from './scale';
