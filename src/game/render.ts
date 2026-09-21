import { CATCH_R, POWER_MAX } from './constants';
import { BASKET, GH, GW, TEE, groundAt, heightAt, isTee, isWater } from './course';
import { DISCS } from './discs';
import { rad } from './math';
import { restDist, sigA, sigD, throwDist } from './physics';
import { m, tl } from './scale';
import { aimBase, autoTapIn } from './sim';
import type { GameState, Vec } from './types';

// iso tile width/height, px per elevation unit
const TW = 56;
const TH = 28;
const HZ = 20;
// projection origin, keeps the whole grid on canvas
const OX = 392;
const OY = 100;

export const proj = (x: number, y: number, h = 0) => ({
  x: OX + ((x - y) * TW) / 2,
  y: OY + ((x + y) * TH) / 2 - h * HZ,
});

type Ctx = CanvasRenderingContext2D;

function tilePath(cx: Ctx, tx: number, ty: number, h: number) {
  const a = proj(tx, ty, h);
  const b = proj(tx + 1, ty, h);
  const c = proj(tx + 1, ty + 1, h);
  const d = proj(tx, ty + 1, h);
  cx.beginPath();
  cx.moveTo(a.x, a.y);
  cx.lineTo(b.x, b.y);
  cx.lineTo(c.x, c.y);
  cx.lineTo(d.x, d.y);
  cx.closePath();
}

function drawTile(cx: Ctx, s: GameState, tx: number, ty: number) {
  const h = s.toggles.elev ? heightAt(tx, ty) : 0;
  const water = isWater(tx, ty);
  if (h > 0) {
    // side faces, so the plateau reads as raised
    const a = proj(tx, ty + 1, h);
    const b = proj(tx + 1, ty + 1, h);
    const a0 = proj(tx, ty + 1, 0);
    const b0 = proj(tx + 1, ty + 1, 0);
    const c0 = proj(tx + 1, ty, 0);
    const c = proj(tx + 1, ty, h);
    cx.fillStyle = isTee(tx, ty) ? '#4a1917' : '#26361f';
    cx.beginPath();
    cx.moveTo(a.x, a.y);
    cx.lineTo(b.x, b.y);
    cx.lineTo(b0.x, b0.y);
    cx.lineTo(a0.x, a0.y);
    cx.closePath();
    cx.fill();
    cx.fillStyle = isTee(tx, ty) ? '#3a1210' : '#1e2c19';
    cx.beginPath();
    cx.moveTo(b.x, b.y);
    cx.lineTo(c.x, c.y);
    cx.lineTo(c0.x, c0.y);
    cx.lineTo(b0.x, b0.y);
    cx.closePath();
    cx.fill();
  }
  tilePath(cx, tx, ty, h);
  cx.fillStyle = isTee(tx, ty)
    ? '#6b2523'
    : water
      ? (tx + ty) % 2
        ? '#1d4a6b'
        : '#1a4362'
      : h > 0
        ? (tx + ty) % 2
          ? '#41613a'
          : '#3b5934'
        : (tx + ty) % 2
          ? '#37502f'
          : '#32492b';
  cx.fill();
  cx.strokeStyle = 'rgba(0,0,0,.18)';
  cx.stroke();
}

/**
 * A fixed 10 m ruler. The SPACING never changes with the disc - a measuring aid whose units
 * move when you swap disc is worse than none - but the COUNT does, so the rings stop where
 * the disc in hand does rather than promising range it has not got.
 */
function drawRings(cx: Ctx, s: GameState) {
  if (!s.toggles.rings) return;
  const n = Math.floor(m(DISCS[s.disc].max) / 10);
  cx.save();
  for (let ring = 1; ring <= n; ring++) {
    const r = tl(ring * 10);
    cx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const p = proj(s.lie.x + Math.cos(a) * r, s.lie.y + Math.sin(a) * r, 0);
      if (i) cx.lineTo(p.x, p.y);
      else cx.moveTo(p.x, p.y);
    }
    cx.strokeStyle = 'rgba(255,255,255,.13)';
    cx.stroke();
    const lp = proj(s.lie.x, s.lie.y + r, 0);
    cx.fillStyle = 'rgba(255,255,255,.3)';
    cx.font = '10px monospace';
    cx.fillText(`${ring * 10}m`, lp.x - 8, lp.y + 3);
  }
  cx.restore();
}

/** The cone is the whole point of Q1: risk has to be visible BEFORE you commit. */
function drawCone(cx: Ctx, s: GameState, p: number) {
  const disc = DISCS[s.disc];
  const d0 = throwDist(disc, p);
  const sa = rad(sigA(disc, d0)) * 2;
  const sd = sigD(disc, d0) * 2;
  // The cone must show where the disc COMES TO REST, skid included - otherwise the aid is
  // short by the slide length and the throw reads as the game cheating you. The skid is
  // surface-dependent, so it is resolved per angle: the far edge visibly pinches in over
  // water, which is exactly the information the player needs before committing.
  const carryNear = Math.max(0.4, d0 - sd);
  const carryFar = d0 + sd;
  const N = 22;
  const edge = (i: number, carry: number) => {
    const a = s.lockedAngle - sa + (2 * sa * i) / N;
    const r = restDist(s.lie, a, carry, disc);
    return proj(s.lie.x + Math.cos(a) * r, s.lie.y + Math.sin(a) * r, 0);
  };
  cx.beginPath();
  for (let i = 0; i <= N; i++) {
    const q = edge(i, carryFar);
    if (i) cx.lineTo(q.x, q.y);
    else cx.moveTo(q.x, q.y);
  }
  for (let i = N; i >= 0; i--) {
    const q = edge(i, carryNear);
    cx.lineTo(q.x, q.y);
  }
  cx.closePath();
  cx.fillStyle = 'rgba(255,196,84,.20)';
  cx.fill();
  cx.strokeStyle = 'rgba(255,196,84,.55)';
  cx.stroke();
  const md = restDist(s.lie, s.lockedAngle, d0, disc);
  const mk = proj(
    s.lie.x + Math.cos(s.lockedAngle) * md,
    s.lie.y + Math.sin(s.lockedAngle) * md,
    0,
  );
  cx.fillStyle = '#ffc454';
  cx.beginPath();
  cx.arc(mk.x, mk.y, 3, 0, 7);
  cx.fill();
}

function drawAimLine(cx: Ctx, s: GameState) {
  const a = s.phase === 'power' ? s.lockedAngle : s.angle;
  const N = 48;
  cx.setLineDash([5, 5]);
  cx.strokeStyle = 'rgba(255,255,255,.5)';
  cx.beginPath();
  for (let i = 0; i <= N; i++) {
    // follow the terrain, so it stays glued to the ground
    const d = (DISCS[s.disc].max * i) / N;
    const x = s.lie.x + Math.cos(a) * d;
    const y = s.lie.y + Math.sin(a) * d;
    const p = proj(x, y, groundAt(x, y, s.toggles.elev));
    if (i) cx.lineTo(p.x, p.y);
    else cx.moveTo(p.x, p.y);
  }
  cx.stroke();
  cx.setLineDash([]);
}

function drawMarker(cx: Ctx, s: GameState, pos: Vec, color: string, r: number) {
  const h = s.toggles.elev ? heightAt(pos.x | 0, pos.y | 0) : 0;
  const p = proj(pos.x, pos.y, h);
  cx.fillStyle = color;
  cx.beginPath();
  cx.ellipse(p.x, p.y, r, r * 0.5, 0, 0, 7);
  cx.fill();
}

function drawBasket(cx: Ctx, s: GameState) {
  const h = s.toggles.elev ? heightAt(BASKET.x | 0, BASKET.y | 0) : 0;
  const p = proj(BASKET.x, BASKET.y, h);
  cx.fillStyle = 'rgba(0,0,0,.3)';
  cx.beginPath();
  cx.ellipse(p.x, p.y, 11, 5.5, 0, 0, 7);
  cx.fill();
  cx.beginPath(); // the catch radius: what you are aiming at
  for (let i = 0; i <= 32; i++) {
    const t = (i / 32) * Math.PI * 2;
    const q = proj(BASKET.x + Math.cos(t) * CATCH_R, BASKET.y + Math.sin(t) * CATCH_R, h);
    if (i) cx.lineTo(q.x, q.y);
    else cx.moveTo(q.x, q.y);
  }
  cx.strokeStyle = 'rgba(232,237,244,.35)';
  cx.stroke();
  cx.strokeStyle = '#cfd6e0';
  cx.lineWidth = 2;
  cx.beginPath();
  cx.moveTo(p.x, p.y);
  cx.lineTo(p.x, p.y - 34);
  cx.stroke();
  cx.fillStyle = '#9aa6b5';
  cx.beginPath();
  cx.ellipse(p.x, p.y - 22, 10, 5, 0, 0, 7);
  cx.fill();
  if (s.phase === 'done') {
    // the disc, sitting down in the cage
    cx.fillStyle = '#ffd98a';
    cx.beginPath();
    cx.ellipse(p.x, p.y - 25, 7, 3.5, 0, 0, 7);
    cx.fill();
    cx.strokeStyle = '#8a6b2a';
    cx.stroke();
  }
  cx.fillStyle = '#e8edf4';
  cx.beginPath();
  cx.ellipse(p.x, p.y - 34, 8, 4, 0, 0, 7);
  cx.fill();
  cx.lineWidth = 1;
}

function drawDisc(cx: Ctx, s: GameState) {
  const f = s.flight!;
  const t = Math.min(1, f.t / f.dur);
  let x: number;
  let y: number;
  let ground: number;
  let air = 0;
  if (f.t <= f.dur) {
    x = f.from.x + (f.to.x - f.from.x) * t;
    y = f.from.y + (f.to.y - f.from.y) * t;
    ground = s.toggles.elev ? f.h0 + (f.h1 - f.h0) * t : 0;
    air = Math.sin(Math.PI * t) * f.arc;
  } else {
    // skidding: on the ground, decelerating
    const ts = Math.min(f.skidDur, f.t - f.dur);
    const d = f.skid.samples[Math.min(f.skid.samples.length - 1, Math.floor(ts / f.skid.dt))];
    x = f.to.x + Math.cos(f.a) * d;
    y = f.to.y + Math.sin(f.a) * d;
    ground = groundAt(x, y, s.toggles.elev);
  }
  const h = ground + air;
  if (s.toggles.shadow) {
    // shadow is the main depth cue under test
    const sp = proj(x, y, ground);
    const k = 1 - (air / Math.max(f.arc, 0.001)) * 0.45;
    cx.fillStyle = 'rgba(0,0,0,.35)';
    cx.beginPath();
    cx.ellipse(sp.x, sp.y, 7 * k, 3.5 * k, 0, 0, 7);
    cx.fill();
  }
  const p = proj(x, y, h);
  cx.fillStyle = '#ffd98a';
  cx.beginPath();
  cx.ellipse(p.x, p.y, 7, 3.5, 0, 0, 7);
  cx.fill();
  cx.strokeStyle = '#8a6b2a';
  cx.stroke();
}

function drawBars(cx: Ctx, s: GameState, height: number) {
  const bx = 24;
  const by = height - 54;
  const bw = 380;
  const bh = 16;
  cx.fillStyle = 'rgba(255,255,255,.08)';
  cx.fillRect(bx, by, bw, bh);

  // Manual mode: mark the danger zone before the charge starts, so the cliff is never a
  // surprise. The bar runs to POWER_MAX, so 100% sits just short of the right-hand end.
  const danger = s.mode === 'manual' && (s.phase === 'idle' || s.phase === 'power');
  const px = (v: number) => bx + (bw * v) / POWER_MAX;
  if (danger) {
    cx.fillStyle = 'rgba(200,60,50,.30)';
    cx.fillRect(px(0.95), by, px(1) - px(0.95), bh);
    cx.fillStyle = 'rgba(235,70,55,.55)';
    cx.fillRect(px(1), by, px(POWER_MAX) - px(1), bh);
    cx.fillStyle = 'rgba(255,255,255,.55)';
    cx.fillRect(px(1) - 1, by - 3, 2, bh + 6);
  }

  if (s.phase === 'dir' || s.phase === 'power') {
    if (s.phase === 'dir') {
      const v = (s.angle - (aimBase(s) - rad(75))) / rad(150);
      cx.fillStyle = '#7fb3d5';
      cx.fillRect(bx, by, bw * v, bh);
      cx.fillStyle = '#fff';
      cx.fillRect(bx + bw * v - 1, by - 4, 2, bh + 8);
    } else if (!danger) {
      // timing sweep: plain 0..100% bar
      cx.fillStyle = '#e8a33d';
      cx.fillRect(bx, by, bw * s.power, bh);
      cx.fillStyle = '#fff';
      cx.fillRect(bx + bw * s.power - 1, by - 4, 2, bh + 8);
    } else {
      // manual charge: goes red inside the zone
      const safe = Math.min(s.power, 0.95);
      cx.fillStyle = '#e8a33d';
      cx.fillRect(bx, by, px(safe) - bx, bh);
      if (s.power > 0.95) {
        cx.fillStyle = s.power >= 1 ? '#ff4a3d' : '#d9452f';
        cx.fillRect(px(0.95), by, px(s.power) - px(0.95), bh);
      }
      cx.fillStyle = '#fff';
      cx.fillRect(px(s.power) - 1, by - 4, 2, bh + 8);
    }
  }

  cx.fillStyle = '#9aa6b5';
  cx.font = '12px monospace';
  cx.fillText(prompt(s), bx, by - 10);
}

function prompt(s: GameState): string {
  if (s.phase === 'done') return 'holed out - R to reset';
  if (autoTapIn(s)) return 'space to tap in';
  if (s.mode === 'manual') {
    if (s.phase === 'power') {
      return 'POWER - release before 100% or the throw is blown (esc to cancel)';
    }
    return s.phase === 'flying' ? '' : 'arrows to aim, hold space for power';
  }
  if (s.phase === 'dir') return 'DIRECTION - space to lock';
  if (s.phase === 'power') return 'POWER - space to throw (more power = bigger cone)';
  return s.phase === 'flying' ? '' : 'space to start aiming';
}

export function render(cx: Ctx, s: GameState, width: number, height: number): void {
  cx.clearRect(0, 0, width, height);
  for (let sum = 0; sum < GW + GH; sum++) {
    for (let tx = 0; tx < GW; tx++) {
      const ty = sum - tx;
      if (ty >= 0 && ty < GH) drawTile(cx, s, tx, ty);
    }
  }
  drawRings(cx, s);
  drawMarker(cx, s, TEE, 'rgba(220,220,220,.55)', 9);
  if (s.phase === 'dir' || s.phase === 'power' || (s.mode === 'manual' && s.phase === 'idle')) {
    drawAimLine(cx, s);
  }
  if (s.phase === 'power' && s.toggles.cone) drawCone(cx, s, s.power);
  drawBasket(cx, s);
  if (s.phase !== 'done') drawMarker(cx, s, s.lie, '#ff8a5c', 5);
  if (s.flight) drawDisc(cx, s);
  drawBars(cx, s, height);
}
