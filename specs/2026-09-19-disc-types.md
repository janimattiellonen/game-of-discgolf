# Disc Types: Putter, Midrange, Driver

**Status:** implemented on `feat/disc-types`; the feel comparison against the prototype is
the one thing still outstanding
**Date:** 2026-09-19
**Prompt:** `prompts/disc types.md`

## Problem Statement

There is one disc. Its whole character is two numbers in `course.ts` — `PUTT_M = 7.5` and
`DRIVE_M = 55` — and every throw in the game is drawn from the same scatter curve and slides
on the same friction. The power bar is therefore the only decision the player makes, and it
is a decision about one axis: how far.

Real disc golf gives you a bag. The choice of *which* disc is a trade the player makes before
the power bar ever appears: reach against control, and a run-out you either want or dread.
This spec introduces three discs — putter, midrange, driver — one of each, always in the bag,
and defines what makes them fly differently.

It is deliberately the simple version. There is no stability, no fade, no hyzer angle, no
wear, no bag management. Those are separate specs, and the model here is shaped so they can
be added as more fields on the same record rather than as a rewrite.

## The Disc Model

A disc is a plain data record. No per-disc branches anywhere in `physics.ts` — the existing
formulas already take these parameters, they just take them from module constants today.

The table is **authored in metres**, because that is how discs are talked about, and
**derived into tiles** at module load. Nothing downstream of `DISCS` ever sees a metre. This
is the same rule the rest of the model follows: metres are a display unit, and the one place
a real-world figure enters the model is through `tl()` at the edge.

```ts
// src/game/discs.ts
export type DiscType = 'putter' | 'midrange' | 'driver';

export interface Disc {
  type: DiscType;
  /** the power bar's ends, in TILES */
  min: number;
  max: number;
  /** multiplies angular scatter σ: below 1 is easier to control */
  control: number;
  /** multiplies distance scatter σ */
  spread: number;
  /** multiplies SKID_DECEL: below 1 slides further */
  grip: number;
}

const disc = (
  type: DiscType,
  minM: number,
  maxM: number,
  control: number,
  spread: number,
  grip: number,
): Disc => ({ type, min: tl(minM), max: tl(maxM), control, spread, grip });

export const DISCS: Record<DiscType, Disc> = {
  putter: disc('putter', 4, 25, 0.65, 0.75, 1.6),
  midrange: disc('midrange', 12, 55, 1, 1, 1),
  driver: disc('driver', 20, 75, 1.25, 1.3, 0.55),
};
```

Five numbers per disc. They map one-to-one onto the three things the prompt asked for —
maximum distance (`min`/`max`), ease of control (`control`/`spread`), amount of skip (`grip`).
A fourth trade-off falls out of `grip` without being asked for; it is named in the Skid
section rather than left to be discovered.

### The table

| | min | max | `control` | `spread` | `grip` |
|---|---|---|---|---|---|
| putter | 4 m | 25 m | 0.65 | 0.75 | 1.60 |
| midrange | 12 m | 55 m | **1.00** | **1.00** | **1.00** |
| driver | 20 m | 75 m | 1.25 | 1.30 | 0.55 |

The midrange is the 1.0 row in all three columns: it is the disc the multipliers are defined
against, and reading the table tells you at a glance which way each disc deviates. It is
**not** a claim that the midrange flies like today's disc — see the next section, where it
does not.

`DRIVE_M` and `PUTT_M` leave `course.ts` entirely, with no placeholder left behind. They
described a player; this table describes equipment.

### Why the driver's floor is 20 m

Each disc's power bar spans its own `min..max`, so a driver cannot be feathered down to a
5 m putt — its softest throw is 20 m. Standing 10 m out with a driver in hand is simply the
wrong club, and the player has to switch. This is the whole reason disc choice matters near
the basket rather than only off the tee.

The putter's floor is a different kind of number and is set by the gimme circle, below.

## Scatter Must Key Off Distance, Not the Power Bar

This is the one non-obvious thing in the spec, and getting it wrong inverts the entire
design.

Today `sigA(p)` reads the power bar directly: `SIG_A0 + p * (SIG_A1 - SIG_A0)`. With per-disc
ranges, `p` stops meaning the same thing on different discs. A 25 m throw is **full power** on
a putter (`p = 1`) but a **feather** on a driver (`p = 0.09`). Keep reading the bar and the
table above produces this:

```
25 m throw, scatter keyed to the power bar:
  putter   p=1.00 -> 14.0° × 0.65 =  9.1°
  driver   p=0.09 ->  4.0° × 1.25 =  5.0°   <- the driver is the accurate one
```

The driver wins. That is backwards, and no amount of tuning the multipliers fixes it,
because the cause is the normalisation, not the constants.

So scatter is keyed to **effort**: the carry, in tiles, as a fraction of the longest throw in
the bag.

```ts
export const REF_M = 75;          // see "The yardstick", below
export const REF_D = tl(REF_M);

export const effort = (carry: number) => clamp(carry / REF_D, 0, 1);

export const sigA = (d: Disc, carry: number) =>
  (SIG_A0 + effort(carry) * (SIG_A1 - SIG_A0)) * d.control;

export const sigD = (d: Disc, carry: number) =>
  carry * (SIG_D0 + effort(carry) * (SIG_D1 - SIG_D0)) * d.spread;
```

`sigD` loses an argument on the way: it took `(p, d)` — the same throw expressed twice — and
now takes the carry once.

Angular σ, and what it costs in metres of lateral miss at that range:

| | 25 m | 40 m | 55 m | 75 m |
|---|---|---|---|---|
| putter | 4.3° — 1.9 m | — | — | — |
| midrange | 6.7° — 2.9 m | 8.9° — 6.2 m | 11.1° — 10.8 m | — |
| driver | 8.3° — 3.7 m | 11.1° — 7.8 m | 13.8° — 13.5 m | 17.5° — 23.6 m |

Monotonic at every distance two discs share, which is the property the design needs and the
property the tests assert. A putter is the accurate disc, a driver is the wild one, and the
only way to reach 75 m is to accept 17.5° of spray.

### What this costs

The reparameterisation changes the midrange's feel at **every** distance, not just at the
top. Today a 25 m throw scatters 7.05° and a 55 m throw 14°; the midrange now gives 6.7° and
11.1°. There is no distance at which it matches today's disc, and there is no tuning of
`control` that would fix that — a single multiplier cannot reshape a curve. This is the price
of fixing the inversion, and it is a price, not a preserved baseline.

One number does survive: **the driver at 55 m scatters 13.5 m laterally against today's
13.7 m.** Today's full-power throw is now the driver's mid-bar throw, which is the closest
thing to a fixed point the comparison against `prototypes/throw-feel.html` has.

### The power bar within one disc

`constants.ts` states the design invariant as *"power sets distance AND scatter, so there is
no correct spot on the bar."* Under effort, that invariant weakens inside a short disc. A
putter's entire bar spans 2.3° → 4.3°; a driver's spans 7.4° → 17.5°.

This is accepted, deliberately, and the banner comment in `constants.ts` is updated to say
so. Risk now lives primarily in the **choice of disc**, and secondarily in how hard you throw
it; on a putter, the only real gamble left on the bar is the overcharge cliff. The
alternative — blending effort with `p` so the top of every bar stays spicy — reintroduces
exactly the `p`-dependence that caused the inversion, and would be a third normalisation in
one file.

### The yardstick

`REF_M` is a standalone constant, not `DISCS.driver.max`. Derived, retuning the driver would
silently rescale every other disc's scatter, including the putter's — a coupling nobody
reading the putter's row would expect.

A test asserts `REF_D === DISCS.driver.max`. The relationship is real and must hold, or
`effort` never reaches 1 and the top of the scatter curve becomes unreachable; writing it as
a test rather than as a derivation makes retuning the driver a decision someone has to make
out loud instead of a side effect they never see.

## Skid

`grip` multiplies `SKID_DECEL` only — 32 tiles/s² for a putter, 20 for a midrange, 11 for a
driver. Water is untouched: `WATER_DECEL` is 150 tiles/s² and kills any disc in ~0.15 tiles,
and a driver skipping across a pond is not a feature.

```ts
const decelAt = (d: Disc, x: number, y: number) =>
  isWaterAt(x, y) ? WATER_DECEL : SKID_DECEL * d.grip;
```

Slide length goes with the *square* of impact speed, so `grip` compounds with reach. A
full-power driver arrives faster **and** decelerates at 11 instead of 20, and runs out several
times further than a putter ever could. That is the wide rim the prompt asked for, and it is
the driver's real cost near the basket: it does not stop. A putter at 1.6 sits down almost
where it lands.

### The fourth trade-off: `grip` also decides who sticks in the chains

`basketEvent` rejects a pass-through above `CATCH_SPEED = 6` tiles/s, and it walks the skid
samples as well as the carry. Two discs arriving with the same impact speed therefore do not
have the same chance of staying in: a putter bleeding 32 tiles/s² is under the catch
threshold within a fraction of a tile, while a driver at 11 is still hot several tiles into
its slide. A putter that skids through the basket is caught where a driver rattles out.

This is the right outcome — it is the putting disc — and it falls out of a single multiplier,
which is the argument for the whole data-driven design. But the table above advertises three
trade-offs and this is a fourth, arriving unannounced. Written down here it is a property;
left emergent it is one refactor away from being "fixed" by someone who thinks it is a bug.
A test asserts it.

## The Gimme Circle and the Putter's Floor

`GIMME_R` goes from 1.5 tiles to **0.8 tiles (4 m)**, and the putter's floor is set to the
same 4 m.

The rule the code already documents is *"inside the shortest possible throw there is no shot
to play, and that range is exactly where the tap-in button belongs."* Today that rule holds
by coincidence of two constants being equal: `GIMME_R = 1.5` tiles and `MIN_D = tl(7.5) =
1.5` tiles. A bag breaks the coincidence, and it can break in two different ways:

- **Leave `GIMME_R` at 1.5 tiles.** The putter's softest throw is only ever legal at a range
  where the game is also offering to skip it. The bottom of the putter's bar is dead.
- **Shrink `GIMME_R` to 0.8 tiles and leave the putter's floor at 7.5 m.** Worse: every lie
  between 4 m and 7.5 m has *no legal shot at all*. You cannot tap in, and the softest throw
  in the bag overshoots. From 5 m the putter's floor lands you 2.5 m past the pin, inside the
  gimme, so you tap in from there — two strokes, guaranteed, where the game costs one today.
  That is not a penalty for bad play, it is a stroke the player can neither avoid nor explain.

So both constants move together: `GIMME_R = 0.8` and `putter.min = tl(4)`. The putter's range
becomes 4–25 m, the 5 m putt is a shot the player stands over, and the documented invariant
holds exactly rather than by coincidence.

A test asserts `GIMME_R === DISCS.putter.min`, for the same reason `REF_D === driver.max` is
asserted: the pair is meaningless apart and nothing else in the code says they belong
together.

This is a deliberate scope addition — it changes scoring on the existing hole, and `GIMME_R`
is the only constant outside the disc model this spec touches. Its banner comment in
`constants.ts` is rewritten to name `DISCS.putter.min` instead of the deleted `MIN_D`.

## The Flier

Maximum distance is soft, upward only.

```ts
export const FLIER_P = 0.08;                   // one throw in twelve or so
export const FLIER_GAIN = [1.05, 1.15] as const;
```

On a **clean** release, an 8% roll adds 5–15% to the carry. The player is told in the log —
an unexplained 12% overshoot reads as a bug, not as luck.

Three rules keep it honest:

- **Clean releases only.** A blown throw already rolls its own severity and loses 15–20% of
  its carry; letting it also roll a bonus would make overcharging ambiguous. Bust the bar and
  there is no upside.
- **It multiplies last, after scatter.** In `release()` the chain becomes
  `d = max(0.4, (d0 + ed) * shrink * gain)` — the gain applies to the finished carry, not to
  `d0` before `sigD` is evaluated. Scaling `d0` first would let the flier widen the spread
  too, and then a flier would be indistinguishable from a long `sigD` draw even in the log.
  It also keeps `effort` keyed to the *intended* carry, which is the one thing that must
  never be computed from the outcome.
- **The roll is a parameter, not a call to `Math.random()`.** `flierGain(roll: number)` is a
  pure function of a number in `[0, 1)`; `sim.ts` draws the roll. This keeps `physics.ts`
  testable without mocking the global, which is how `gauss()` should have been written too.

The flier stacks on top of `sigD`, which already lets a throw land long. The flier is the
*rare and noticeable* case — the one the player tells a story about — where `sigD` is the
constant hum of imprecision.

It is also the mechanic most likely to be cut. A flier on a full-power driver reaches 86 m on
an 83 m hole; see the Monte Carlo gate below.

## Selection

Q = putter, W = midrange, E = driver, plus a **radio group** in `Panel.tsx` — `name="disc"`,
shaped like the existing "Aiming mode" control, which is a `<label>`-wrapped radio group and
not the `<button>`s used by the aid toggles. Disc selection is one-of-three, so it is a radio
group for the same reason aiming mode is.

Keys `1`–`4` are the aid toggles and stay that way. In `bindKeys`, Q/W/E go **beside the
`Digit1`–`Digit4` handling, above the `if (state.mode === 'manual')` branch**. That branch
ends in `return`, so anything added below it is unreachable in manual mode — the same trap
`Escape` and `KeyR` already sit above.

`disc: DiscType` lives on `GameState`. **`reset()` restores the driver** rather than
preserving the selection, which makes it the one piece of state that behaves differently from
`mode` and `toggles`, and the difference is the point: `mode` and `toggles` are *preferences*
— how you want to play — while the disc in your hand is a *move*, and what this shot needs.
`reset()` puts you back on the tee of an 83 m hole; starting it holding the putter that holed
out the last one is a bug the player has to notice before it costs a stroke.

Selection persists across throws within a hole, and "the default at the tee is the driver" is
then literally true rather than true once per page load.

The public API in `src/game/index.ts` gains one method:

```ts
setDisc(type: DiscType): void;
```

It is honoured in phase `idle` and `done`, and ignored otherwise. **Unlike `setMode`, it does
not cancel a running charge** — `setMode` has to, because changing the aiming mode invalidates
the phase the player is in, whereas pressing W with the power bar climbing is a fumble, and
silently dumping a charged throw is a worse answer to a fumble than doing nothing. That
asymmetry is deliberate and is worth a comment at the call site, because it will otherwise
read as an oversight.

## Snapshot, Panel and Rendering

**One** new field on `Snapshot`:

```ts
disc: DiscType;
```

That is the only part of the disc that changes at runtime. The table itself is static, so
`src/game/index.ts` re-exports `DISCS`, `DiscType` and `m` alongside `TILE_M`, and the picker
reads reach and floor straight from the table — the same way `Panel.tsx` already imports
`TILE_M`. Republishing static data on every snapshot at 10 Hz would be noise, and a
`discMaxMetres` field would be one number out of five with no principle behind the choice.

The flier does **not** get a boolean. It goes into `lastErr`, which is already the per-throw
diagnostic line and already carries `BLOWN x1.7` in exactly this shape:

```
-2.3° / +4.1m / skid 6.8m / FLIER +12%
```

`lastErr` has a defined lifetime — it is overwritten by the next release — where a `flier`
boolean would need a clearing rule nobody would remember.

`throwMetres`, `sigAngle` and `sigDistance` keep their meaning and start reflecting the
selected disc, because their inputs now do. The panel also carries a `Disc` row in the stats
box — name and reach — because the picker sits far below the numbers it changes, and the
readouts above are otherwise unattributed.

On the canvas, three things read the disc, and they are three different decisions:

- **The landing cone** (`drawCone`) is built from `sigA`/`sigD`/`restDist`, so it narrows on a
  putter and flares on a driver once the disc is threaded through, with no further change.
  This is the main way the player *sees* control rather than reading it off the panel.
- **The aim line** (`drawAimLine`) walks its dashes out to `MAX_D`. That becomes the selected
  disc's `max`, so the dashed line visibly reaches further with a driver in hand.
- **The distance rings** (`drawRings`) are a fixed `[2, 4, 6, 8]` tile ruler labelled
  10/20/30/40 m, and the spacing **stays fixed**. A ruler whose units change when you swap
  disc is worse than no ruler. What changes is how many rings are drawn:
  `floor(m(disc.max) / 10)` — 2 for the putter, 5 for the midrange, 7 for the driver. Rings
  extending past what the disc can throw are the same lie in the other direction.

## Testing

Per CLAUDE.md, new work in `src/game/` gets tests first, beside the code.

New — `src/game/discs.test.ts`:

- Every disc has `min < max`.
- `min` and `max` are both strictly increasing putter → midrange → driver.
- `control` and `spread` increase and `grip` decreases across the same order — the three
  trade-offs all point the same way, and a typo that broke one of them would otherwise pass
  silently.
- The midrange is exactly 1.0 in all three multiplier columns, because the whole table is
  read relative to it.
- `REF_D === DISCS.driver.max`, so `effort` reaches 1 and the top of the scatter curve is
  reachable. This is the gate that makes retuning the driver a deliberate act.
- `GIMME_R === DISCS.putter.min`, so the tap-in circle and the shortest throw in the bag can
  never drift apart and open a range with no legal shot in it.
- `effort` clamps at both ends.
- `flierGain(0) === 1.05`, `flierGain(0.999…) < 1.15`, and it is monotonic.

New, in `src/game/physics.test.ts`:

- **The inversion regression.** At every distance all three discs can throw — 15 m, 20 m,
  25 m, which is the band the putter's 25 m ceiling leaves — `sigA` and `sigD` are strictly
  ordered putter < midrange < driver. (An earlier draft named 40 m here; no putter can throw
  it, so there is nothing to order.) This is the test that
  earns its place: it is the failure the naive design produces, and it is invisible in play
  until someone notices the driver is the accurate disc.
- `throwDist(disc, 0)` is `disc.min` and `throwDist(disc, 1)` is `disc.max` for all three,
  and `m()` of those is the authored metre figure.
- A putter's skid is shorter than a driver's from the same impact speed, and each still
  matches the closed form `v² / (2 · SKID_DECEL · grip)` on grass.
- **The air hole-out ceiling meets the bag.** A putter and a midrange can be thrown softly
  enough to arrive under the ~19.1 m ceiling; the driver's 20 m floor sits past it, so a
  driver can never hole out of the air at any power. The margin is under a metre, so the
  test says so.
- **The fourth trade-off:** `basketEvent` itself is called — not a proxy for it — on two
  flights with an identical line and carry, the basket set 1.4 tiles past the landing so the
  disc enters the cylinder 0.85 tiles into the slide and the carry never clips the cage. The
  putter is caught, the driver rattles out, and a third case pins the whole bag: arrival speed
  at the chains is ordered putter < midrange < driver. Asserting the mechanism instead of the
  outcome would leave the property the section is here to pin unpinned.
- Water still stops every disc inside 0.2 tiles, driver included.

Updating — and `MAX_D`/`MIN_D` have a wider blast radius here than the deletion suggests.
`physics.test.ts` names them in 17 places, and **most of those assertions are not about discs
at all**: `flightDur(MAX_D)`, `flightArc(MAX_D) === 3.2`, `skidPath(grass, 0, MAX_D)`,
`impactSpeed(MAX_D)`, `carrySpeed(MAX_D) > CATCH_SPEED`. Those tests wanted "a long throw" and
grabbed the only long-throw constant in scope.

- Those get a local `const LONG = 11` / `SHORT = 0.8` in the test file, with a comment saying
  they are arbitrary tile distances and **deliberately not disc-derived**. `flightArc`
  saturating at 3.2 and water killing a skid inside 0.2 tiles are properties of the physics,
  not of the driver. Pointing them at `DISCS.driver.max` would turn a dozen unrelated tests
  red every time a disc is retuned, which teaches everyone to update numbers without reading
  them.
- Only the genuinely disc-shaped assertions name `DISCS`: the `throwDist` endpoints, the skid
  closed form, and the inversion regression.
- `physics.test.ts` also asserts the 7.5 m / 55 m throw endpoints and the 3° / 14° scatter
  ends against the old globals. Those move to the midrange and to the effort curve.
- `course.test.ts:33` asserts `tl(holeLength()) > MAX_D`. It **retargets at
  `DISCS.driver.max`** — 16.6 tiles against 15, still true but by 1.6 tiles instead of 5.6 —
  and its comment is rewritten to say what it now guards. This is the one test in the suite
  that encodes *the pin is unreachable off the tee*, which is the hole's entire design premise
  and precisely what the driver threatens. It should fail loudly the day someone bumps the
  driver to 85 m.

Not covered, deliberately: the Q/W/E bindings and the picker, which live in `bindKeys` and
React, where the project does not test. Nothing asserts ring *counts* either — `render.ts` is
outside the tested surface by the same rule.

## Acceptance Criteria

- [x] `src/game/discs.ts` holds `DiscType`, `Disc`, the `DISCS` table, `DISC_TYPES` (bag
      order, which the picker and the tests both read), `DISC_KEYS` (the letters, so the panel
      prints what `bindKeys` binds), `effort` and `flierGain`, with the reasoning for each
      column in a banner comment. `constants.ts` keeps the scalars — including `FLIER_P` and
      `FLIER_GAIN`, which are throw tuning consumed by `sim.ts` and belong with the scatter
      and overcharge numbers. `REF_M` stays in `discs.ts`: its whole meaning is a relationship
      to the table, and the test that pins it is about the bag.
- [x] The table is authored in metres and derived to tiles at module load. No metre value
      crosses into `physics.ts` or `sim.ts`.
- [x] `DRIVE_M` and `PUTT_M` are gone from `course.ts`, with no placeholder arm left behind.
- [x] `sigA` and `sigD` are keyed to effort against `REF_D`, not to the power bar, and are
      strictly ordered by disc at any shared distance.
- [x] `throwDist`, `sigA`, `sigD` and the skid all take the disc; `physics.ts` contains no
      `switch` on disc type.
- [x] `GIMME_R` is 0.8 tiles, equals `DISCS.putter.min`, and its comment explains the pairing.
- [x] The `constants.ts` scatter banner records that the within-disc risk gradient is now
      secondary to disc choice.
- [x] The flier fires on ~8% of clean releases for +5–15% carry, multiplies the finished carry
      after scatter, never fires on a blown throw, and appears in `lastErr` and the log.
- [x] Q/W/E — bound above the manual-mode `return` in `bindKeys` — and a `name="disc"` radio
      group select a disc; selection is ignored mid-throw, does not cancel a charge, persists
      between throws, and is restored to the driver by `reset()`.
- [x] `Snapshot` carries `disc` and nothing else new; `src/game/index.ts` re-exports `DISCS`,
      `DiscType` and `m` for the picker.
- [x] The landing cone and the aim line reflect the selected disc; ring spacing stays 10 m and
      only the ring count varies.
- [x] `pnpm check` is green — 65 tests, plus the 2 the Monte Carlo keeps skipped.
- [x] **Monte Carlo before the feel is signed off.** Run before any implementation existed,
      against a harness that mirrored the model; then rebuilt on the shipped functions and
      **committed** as `src/game/montecarlo.test.ts`, run with `pnpm sim` and skipped by
      default. Numbers are in open question 1: the hole survives, the flier is exonerated, and
      full power turns out to be the wrong driver shot.

      It is committed rather than thrown away because the decision changed underneath the
      earlier one. A throwaway is fine for a number that settles an argument and is then
      forgotten; these figures ended up quoted as fact in `constants.ts`, `course.ts` and
      `course.test.ts`, and a number asserted in three source files cannot rest on a harness
      nobody can re-run. It is still not a regression gate and still asserts nothing about
      balance — pinning that with a test would freeze a hole the measurement spec is already
      planning to replace.
- [ ] The driver at 55 m is compared against `prototypes/throw-feel.html` at full power. It
      is the only throw in the new model that should feel like the old one — 13.5 m of lateral
      scatter against the prototype's 13.7 m, the one fixed point the reparameterisation left
      standing. Every other disc and distance is new feel by construction, so "different"
      there is expected rather than a finding, and CLAUDE.md's rule about saying "different"
      out loud applies to this throw alone.

## How This Lands

Three commits, not one and not six.

1. **The disc model.** `discs.ts`, the effort curve, the physics signatures, `disc` on
   `GameState`, `setDisc`, the keys and the picker, the canvas aids, and the test suite. This
   is one commit because it cannot be split into compiling pieces — `throwDist` cannot take a
   disc before `sim.ts` has one to pass it.
2. **The gimme circle and the putter's floor.** `GIMME_R`, `DISCS.putter.min`, the equality
   test and the rewritten banner comment.
3. **The flier.** `FLIER_P`, `FLIER_GAIN`, `flierGain`, the `release()` chain and the
   `lastErr` field.

The last two are each a single coherent `git revert`, and that is the whole reason they are
separate. They change different things from the disc model — commit 2 changes scoring on the
existing hole, commit 3 is expected to be undone if the Monte Carlo goes the wrong way — and
unpicking either one from a nine-file commit afterwards is archaeology rather than a revert.
Two extra commits is a cheap price for that, precisely because one of them is likely to be
called in.

## Open Questions

1. **Answered: the hole survives, and the driver makes it harder rather than easier.**
   The fear was that a 75 m driver against an 83 m hole would collapse "commit fully or go
   around" into "always commit". It does not. 200 000 tee shots, aimed at the pin, scatter and
   skid applied, resting position classified:

   | tee shot | drowns | taps in | mean left |
   |---|---|---|---|
   | today, full power (55 m) | 28.8% | 0.1% | 27.9 m |
   | midrange, full power | 31.9% | 0.0% | 25.8 m |
   | driver, full power | 52.4% | 1.8% | 18.3 m |
   | driver, full power + flier | 53.7% | 1.8% | 18.1 m |
   | driver, 80% power (64 m) + flier | 29.5% | 2.7% | 19.3 m |

   The pin is not drivable: a 1.8% tap-in rate against a **52% drowning rate**. The driver's
   17.5° of scatter and its long run-out put it in the water more than half the time, so the
   greedy line got *worse*, not better, and the route dilemma is intact.

   Two things fall out. **The flier is exonerated** — 53.7% against 52.4%, with an identical
   tap-in rate; it was never what tipped the hole, and the pre-committed fallback of cutting it
   is not needed. And **the driver has a correct spot on its bar after all**: 80% power nearly
   halves the drowning rate (29.5%) while *improving* the tap-in rate to 2.7%. Full power is
   simply the wrong shot here. That is a real decision on the power bar, restored by the water
   rather than by the scatter curve — which is a better answer to the worry in *The power bar
   within one disc* than the blend that was rejected there.

   The pre-commitment — the hole moves, the discs stand — therefore triggers nothing. It stays
   recorded because it is why these numbers could be read straight.

   The harness validates against the known baseline: today's full power drowns 28.8%, against
   the ~27% recorded in `course.ts` from the original tuning.

2. **The 75 m driver is wild in a way nothing has been yet.** 17.5° of σ at full reach is a
   23.6 m lateral miss at one sigma, on a board 100 m wide. `MAX_ERR_A` caps the tail at 40°,
   so it stays in front of you, but whether a disc that unreliable is *fun* or merely random
   is a question only play answers.

3. **Nothing stops a full-power driver from inside the gimme circle.** There is no rule
   against it and probably should not be — it is a bad idea the game should let you have.

## Out of Scope

Stability and fade, disc wear, bag composition beyond one of each, per-disc flight arcs or
flight paths (an S-curve is not a straight line plus scatter), wind, player skill, and the
basket catch model — `CATCH_R`, `CATCH_H` and `CATCH_SPEED` are unchanged, even though `grip`
changes which discs clear the speed gate. The OB rule, overcharge and the water penalty are
unchanged.

One note for the skill spec, so it does not have to be rediscovered: `DRIVE_M` was the only
thing in the codebase that said *who the player is*, and this spec deletes it. The intended
re-entry point is `max * arm` on the disc table and something like `control / skill` on the
scatter, applied where `DISCS` is read rather than stored on the record. No placeholder is
left behind on purpose — an unused `arm = 1.0` is a field the next spec would have to argue
with before it could use it.
