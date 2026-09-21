# Auto Tap-In Inside the Gimme Circle

**Status:** implemented in `src/game/`; not in `prototypes/throw-feel.html`. Written against
the catch circle, rebased onto the bag, and resolved onto the gimme circle — see **The Band
Between the Circles**, which is closed.
**Date:** 2026-09-19

## Problem Statement

When the disc comes to rest inside the gimme circle — the range in which the tap-in button
is offered — there is no throw worth playing. The softest throw in the bag is the putter's
floor (4 m, `DISCS.putter.min`), and `GIMME_R` *is* that floor, so from in there every disc
either overshoots or, at best, matches what walking up and dropping it in already gives you.

The arithmetic is worth stating plainly, because it is what settles the radius below. A
tap-in costs exactly one stroke and always holes out. A throw from the same spot also costs
one stroke and *might* hole out. Throwing is therefore weakly dominated everywhere inside
the gimme circle: never better, sometimes much worse.

Today the player still has to notice that, move the mouse to the panel and click
**Hole out (tap in)**. The space bar — the key every other throw is made with — charges a
power bar instead, and letting it go throws the disc away from a gimme. That is a trap with
no upside: there is no skill being expressed in the choice, only a chance to misclick.

## The Rule

> While the disc is at rest inside the gimme circle, pressing space holes out.

Concretely: in the `idle` phase, if `dist(lie, BASKET) <= AUTO_TAP_R`, a space press is a
tap-in — it never starts a charge, in either aiming mode, and the power the player would
have put into the throw is irrelevant because no throw happens.

```js
export const AUTO_TAP_R = GIMME_R;   // 0.8 tiles, 4 m
```

The radius is *the range where throwing is dominated*, not a second number that happens to
be near it. Tying `AUTO_TAP_R` to `GIMME_R` by definition means the key and the button can
never disagree: one circle, one rule, and whatever moves `GIMME_R` next moves both.

## What Does Not Change

- **`GIMME_R` (0.8 tiles, 4 m) still governs the tap-in button.** The button is not
  redundant — it is the mouse path to the same action, and it is how a player who has not
  discovered the key still holes out. What changed is that its range and the key's range
  are now the same range.
- **A tap-in is still a stroke.** `tapIn()` increments `throws` exactly as the button does.
  The rule removes a misclick, not a penalty.
- **`CATCH_R` is untouched.** The catch radius is still what a flying disc has to pass
  through and still the ring the player aims at. It simply no longer doubles as the tap-in
  radius.
- **The other phases.** Space in `dir`, `power`, `flying` or `done` behaves as before; the
  rule only reads the `idle` phase, where the disc is at rest and the player is aiming.

## The Band Between the Circles

*Resolved: `AUTO_TAP_R = GIMME_R`. Kept because the reasoning is the reason the radius is
what it is, and the next spec to touch the gimme circle needs to find it here.*

This spec was first written with `AUTO_TAP_R = CATCH_R`, against `GIMME_R = 1.5` tiles, when
the two circles were 2.75 m and 7.5 m apart and the gap between them looked like a real
decision: a 5 m putt is a shot a player stands over, and clicking the button instead was
giving something up.

The disc types spec then moved `GIMME_R` down to 0.8 tiles to meet the putter's floor, for
reasons that have nothing to do with this rule. The band survived the change arithmetically
— `AUTO_TAP_R` was still the smaller circle, and `canTapIn()` still held — but it was now
2.75 m to 4 m, barely a metre wide.

What actually killed it was not the width. Scoring the two options out shows the band never
held a choice at either radius: a throw from inside the gimme circle is weakly dominated by
the tap-in, at 7.5 m exactly as at 3 m. The old spec's "shot a player stands over" was a
feel argument dressed as a decision — there was nothing to decide, only a slower way to take
the same stroke, or a worse one.

So the band goes, and with it the thing that made `AUTO_TAP_R = CATCH_R` attractive: the tie
to a ring the player can see. That is paid for in **Feedback** below, by drawing the gimme
circle as a second ring rather than by leaving the armed range invisible.

## Feedback

Two rings at the foot of the pole, both faint, and they mean different things:

- **`CATCH_R` (2.75 m)** — what you are aiming at. A flying disc has to pass through this
  to go in. Unchanged.
- **`GIMME_R` (4 m)** — where space holes out. Drawn more faintly than the catch ring, in
  the same projected-ellipse style, so the pair reads as one target rather than as two
  pieces of UI.

The canvas prompt under the power bar still reads `space to tap in` whenever the rule is
armed, in place of the aiming hint. The ring says where; the prompt confirms it once the
player is inside.

## Test Notes

`sim.test.ts` covers the rule at the boundary — just inside `AUTO_TAP_R` holes out, just
outside it starts a charge — in both aiming modes, and pins that the auto tap-in counts a
stroke and that it cannot fire mid-flight. Both modes matter at the boundary because they
take different branches of `pressSpace`: manual goes straight to `power`, timing starts
the direction sweep at `dir`.

The inclusive edge of `<=` is deliberately not pinned. A lie placed at `BASKET.x -
AUTO_TAP_R` measures 0.8000000000000007 tiles away, not 0.8, so no state the tests can
build actually sits on the ring — a test claiming to pin `<=` against `<` would be pinning
the sign of a float error. The edge is measure-zero in play and the rule reads the same
either way.

It also pins `AUTO_TAP_R === GIMME_R`. That assertion used to read `<`, guarding the
invariant that an auto tap-in always satisfies `canTapIn()`; equality is the stronger
statement and still implies it. `discs.test.ts` pins `DISCS.putter.min === GIMME_R`
separately, so the chain `putter floor = gimme = auto tap-in` is held end to end and a move
to any link fails a test rather than opening a silent band.
