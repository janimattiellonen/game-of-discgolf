import {
  AUTO_TAP_R,
  CATCH_SPEED,
  CHARGE_TIME,
  FLIER_P,
  FINE_TURN,
  GIMME_R,
  MAX_ERR_A,
  OVER_A,
  OVER_D,
  OVER_SHORT,
  POWER_MAX,
  TURN_RATE,
} from './constants';
import { BASKET, PAR, TEE, heightAt, holeLength, inGrid, isWater } from './course';
import type { DiscType } from './discs';
import { DISCS, flierGain } from './discs';
import { clamp, deg, dist, gauss, lerp, rad } from './math';
import {
  basketEvent,
  flightArc,
  flightDur,
  lastCrossing,
  sigA,
  sigD,
  skidPath,
  throwDist,
} from './physics';
import { classOf, m } from './scale';
import type { AimMode, BasketEvent, GameState, Vec } from './types';

export function createState(): GameState {
  const s: GameState = {
    phase: 'idle',
    mode: 'manual',
    disc: 'driver',
    lie: { ...TEE },
    prevLie: { ...TEE },
    throws: 0,
    penalties: 0,
    t: 0,
    angle: 0,
    power: 0,
    lockedAngle: 0,
    flight: null,
    lastErr: '-',
    log: [],
    held: { left: false, right: false },
    fine: false,
    toggles: { cone: true, shadow: true, rings: true, elev: true },
  };
  s.angle = aimBase(s);
  say(
    s,
    `New hole. ${holeLength().toFixed(0)} m, par ${PAR} (${classOf(holeLength())}). ` +
      'Water costs a stroke.',
  );
  return s;
}

/**
 * Reset in place so anything holding the state object keeps working.
 *
 * mode and toggles survive because they are PREFERENCES - how you want to play. The disc
 * deliberately does not: it is a move, not a preference, and a reset puts you back on the
 * tee of an 83 m hole. Starting that holding the putter you holed out with is a bug the
 * player has to notice before it costs them a stroke.
 */
export function reset(s: GameState): void {
  const fresh = createState();
  fresh.mode = s.mode;
  fresh.toggles = { ...s.toggles };
  Object.assign(s, fresh);
}

export function say(s: GameState, msg: string): void {
  s.log.unshift(msg);
  s.log.length = Math.min(s.log.length, 40);
}

export const aimBase = (s: GameState) => Math.atan2(BASKET.y - s.lie.y, BASKET.x - s.lie.x);

/** Close enough to walk up and drop it in. */
export const canTapIn = (s: GameState) => s.phase === 'idle' && dist(s.lie, BASKET) <= GIMME_R;

/**
 * Inside the basket circle there is nothing to aim at: the shortest throw in the arm still
 * overshoots. So space holes out rather than starting a charge, whatever the power would
 * have been. AUTO_TAP_R < GIMME_R, so this always satisfies canTapIn().
 */
export const autoTapIn = (s: GameState) => s.phase === 'idle' && dist(s.lie, BASKET) <= AUTO_TAP_R;

// ---------------------------------------------------------------- flight

/**
 * A bounce is just another flight, so throws and bounce-outs share this. `bounced` stops a
 * disc that already rattled out from re-testing the basket on the way down.
 */
function startFlight(s: GameState, from: Vec, a: number, d: number, bounced: boolean): void {
  const to = { x: from.x + Math.cos(a) * d, y: from.y + Math.sin(a) * d };
  const sk = skidPath(to, a, d, DISCS[s.disc]);
  const f = {
    from: { ...from },
    to,
    a,
    d,
    t: 0,
    rest: { x: to.x + Math.cos(a) * sk.dist, y: to.y + Math.sin(a) * sk.dist },
    skid: sk,
    skidDur: sk.dur,
    dur: flightDur(d),
    arc: bounced ? 0.25 : flightArc(d),
    h0: heightAt(from.x | 0, from.y | 0),
    h1: inGrid(to.x | 0, to.y | 0) ? heightAt(to.x | 0, to.y | 0) : 0,
    event: null as BasketEvent | null,
  };
  f.event = bounced ? null : basketEvent(f, s.toggles.elev);
  s.flight = f;
  s.phase = 'flying';
}

export function release(s: GameState, blown: boolean): void {
  const disc = DISCS[s.disc];
  const p = Math.min(1, s.power); // no distance bonus for busting
  const d0 = throwDist(disc, p);
  const sev = blown ? Math.random() : 0; // 0 = got away with it, 1 = disaster
  const ea = clamp(
    rad(gauss() * sigA(disc, d0) * (blown ? lerp(OVER_A, sev) : 1)),
    -MAX_ERR_A,
    MAX_ERR_A,
  );
  const ed = gauss() * sigD(disc, d0) * (blown ? lerp(OVER_D, sev) : 1);
  // A blown release does not just spray, it also dumps the throw short.
  const shrink = blown ? lerp(OVER_SHORT, sev) : 1;
  /**
   * Clean releases only - a blown throw already rolls its own severity and loses 15-20% of
   * its carry, and letting it also roll a bonus would make overcharging ambiguous. The gain
   * multiplies LAST, after scatter: scaling d0 first would widen sigD with it, and then a
   * flier would be indistinguishable from a long distance draw even in the log.
   */
  const flier = !blown && Math.random() < FLIER_P ? flierGain(Math.random()) : 1;
  const a = s.lockedAngle + ea;
  const d = Math.max(0.4, (d0 + ed) * shrink * flier);

  startFlight(s, s.lie, a, d, false);
  s.throws++;
  s.lastErr =
    `${deg(ea).toFixed(1)}° / ${ed >= 0 ? '+' : ''}${m(ed).toFixed(1)}m` +
    ` / skid ${m(s.flight!.skid.dist).toFixed(1)}m` +
    (blown ? ` / BLOWN x${lerp(OVER_A, sev).toFixed(1)}` : '') +
    (flier > 1 ? ` / FLIER +${((flier - 1) * 100).toFixed(0)}%` : '');
  if (flier > 1) {
    say(
      s,
      `That one got away - it flew ${((flier - 1) * 100).toFixed(0)}% further than it should.`,
    );
  }
  if (blown) {
    say(
      s,
      `Overcharged - held past 100%. Scatter x${lerp(OVER_A, sev).toFixed(1)}, ` +
        `carry -${((1 - shrink) * 100).toFixed(0)}%.`,
    );
  }
}

function holeOut(s: GameState): void {
  const sc = s.throws + s.penalties;
  const rel = sc - PAR;
  say(s, `IN. ${sc} strokes (par ${PAR}, ${rel >= 0 ? '+' : ''}${rel}). R to reset.`);
  s.phase = 'done';
  s.flight = null;
}

function hitBasket(s: GameState, e: BasketEvent): void {
  if (e.caught) {
    s.lie = { ...e.pos };
    s.flight = null;
    say(s, `Chains at ${m(e.v).toFixed(0)} m/s - it stays in.`);
    holeOut(s);
    return;
  }
  // Too hot: kick out sideways, harder the faster it arrived.
  const a = s.flight!.a + rad((Math.random() * 2 - 1) * 70);
  const d = Math.min(1.6, 0.3 + (e.v - CATCH_SPEED) * 0.12);
  say(s, `Hit the basket at ${m(e.v).toFixed(0)} m/s - too hot, bounced out.`);
  startFlight(s, e.pos, a, d, true);
}

function land(s: GameState): void {
  const to = s.flight!.rest; // where it STOPS, after the skid
  const tx = to.x | 0;
  const ty = to.y | 0;
  s.prevLie = { ...s.flight!.from };
  if (!inGrid(tx, ty) || isWater(tx, ty)) {
    s.penalties++;
    s.lie = lastCrossing(s.flight!.from, to);
    say(
      s,
      `${inGrid(tx, ty) ? 'Water' : 'OB'}. +1, play from the last in-bounds point ` +
        `(${m(dist(s.lie, BASKET)).toFixed(0)} m from the basket).`,
    );
  } else {
    s.lie = { ...to };
    const dd = dist(to, BASKET);
    say(
      s,
      `Landed ${m(dd).toFixed(1)} m from the basket.` +
        (dd <= GIMME_R ? ' Close enough to tap in.' : ''),
    );
  }
  s.flight = null;
  s.phase = 'idle';
  s.angle = aimBase(s);
}

export function tapIn(s: GameState): void {
  if (!canTapIn(s)) return;
  const from = dist(s.lie, BASKET);
  s.throws++; // a tap-in is still a stroke
  s.lie = { ...BASKET };
  say(s, `Tapped in from ${m(from).toFixed(1)} m.`);
  holeOut(s);
}

// ---------------------------------------------------------------- intents
// The UI calls these; it never touches state directly.

export function setMode(s: GameState, mode: AimMode): void {
  s.mode = mode;
  s.held.left = false;
  s.held.right = false;
  if (s.phase === 'dir' || s.phase === 'power') {
    s.phase = 'idle';
    s.power = 0;
    s.t = 0;
  }
  if (s.phase === 'idle') s.angle = aimBase(s);
}

/**
 * Unlike setMode, this does NOT cancel a running charge. setMode has to, because changing
 * the aiming mode invalidates the phase the player is standing in; pressing a disc key with
 * the power bar climbing is a fumble, and silently dumping a charged throw is a worse answer
 * to a fumble than doing nothing at all.
 */
export function setDisc(s: GameState, disc: DiscType): void {
  if (s.phase !== 'idle' && s.phase !== 'done') return;
  s.disc = disc;
}

export function pressSpace(s: GameState, repeat: boolean): void {
  if (autoTapIn(s)) {
    if (!repeat) tapIn(s);
    return;
  }
  if (s.mode === 'manual') {
    // Key repeat fires while it is held down; only the first press starts the charge.
    if (!repeat && s.phase === 'idle') {
      s.lockedAngle = s.angle;
      s.power = 0;
      s.phase = 'power';
    }
    return;
  }
  if (s.phase === 'idle') {
    s.phase = 'dir';
    s.t = 0;
  } else if (s.phase === 'dir') {
    s.lockedAngle = s.angle;
    s.phase = 'power';
    s.t = 0;
  } else if (s.phase === 'power') {
    release(s, false);
  }
}

export function releaseSpace(s: GameState): void {
  // Reaching max throws on its own, so by the time the key comes up the phase may already
  // have moved on.
  if (s.mode === 'manual' && s.phase === 'power') release(s, s.power >= 1);
}

/**
 * Bail out of a charge without throwing. The space keyup that follows sees phase 'idle' and
 * does nothing, and key repeat cannot restart it - you have to press space again.
 */
export function cancel(s: GameState): void {
  if (s.phase !== 'dir' && s.phase !== 'power') return;
  s.phase = 'idle';
  s.power = 0;
  s.t = 0;
  say(s, 'Throw cancelled.');
}

// ---------------------------------------------------------------- step

export function step(s: GameState, dt: number): void {
  s.t += dt;
  if (s.mode === 'manual' && s.phase === 'idle') {
    const turn = (s.held.right ? 1 : 0) - (s.held.left ? 1 : 0);
    if (turn) s.angle += turn * TURN_RATE * (s.fine ? FINE_TURN : 1) * dt;
  } else if (s.mode === 'manual' && s.phase === 'power') {
    s.power += dt / CHARGE_TIME;
    if (s.power >= POWER_MAX) {
      s.power = POWER_MAX;
      release(s, true); // held too long
    }
  } else if (s.phase === 'dir') {
    const tri = Math.abs(((s.t / 1.6) % 2) - 1); // 0..1..0
    s.angle = aimBase(s) - rad(75) + rad(150) * tri;
  } else if (s.phase === 'power') {
    s.power = Math.abs(((s.t / 1.2) % 2) - 1);
  } else if (s.phase === 'flying') {
    const f = s.flight!;
    f.t += dt;
    if (f.event && f.t >= f.event.t) hitBasket(s, f.event);
    else if (f.t >= f.dur + f.skidDur) land(s);
  }
}
