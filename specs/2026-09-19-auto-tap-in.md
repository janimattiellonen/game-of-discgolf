# Auto Tap-In Inside the Basket Circle

**Status:** implemented in `src/game/`; not in `prototypes/throw-feel.html`. Written before
the bag landed and rebased onto it — see **The Band Between the Circles**, which is open.
**Date:** 2026-09-19

## Problem Statement

When the disc comes to rest inside the circle drawn around the basket — the catch radius,
the faint ring at the foot of the pole — there is no throw left to play. The softest throw
in the bag is the putter's floor (4 m, `DISCS.putter.min`), and the catch circle is 2.75 m
across its radius, so every throw from in there overshoots the basket and leaves a longer
putt than the one you started with.

Today the player still has to notice that, move the mouse to the panel and click
**Hole out (tap in)**. The space bar — the key every other throw is made with — charges a
power bar instead, and letting it go throws the disc away from a gimme. That is a trap with
no upside: there is no skill being expressed in the choice, only a chance to misclick.

## The Rule

> While the disc is at rest inside the basket's catch circle, pressing space holes out.

Concretely: in the `idle` phase, if `dist(lie, BASKET) <= AUTO_TAP_R`, a space press is a
tap-in — it never starts a charge, in either aiming mode, and the power the player would
have put into the throw is irrelevant because no throw happens.

```js
export const AUTO_TAP_R = CATCH_R;   // 0.55 tiles, 2.75 m
```

The radius is *the drawn circle*, not a second number that happens to be near it. Tying
`AUTO_TAP_R` to `CATCH_R` by definition means the rule can never drift away from the ring
the player is looking at: retuning the basket moves both together.

## What Does Not Change

- **`GIMME_R` (0.8 tiles, 4 m) still governs the tap-in button.** It is the range in
  which a tap-in is *allowed* — "inside the shortest possible throw there is no shot to
  play". `AUTO_TAP_R` is the tighter range in which a tap-in is *automatic*. Because
  `AUTO_TAP_R < GIMME_R`, an auto tap-in always satisfies `canTapIn()`, so the two rules
  can never contradict each other. What is left between them is no longer obviously a
  choice — see below.
- **A tap-in is still a stroke.** `tapIn()` increments `throws` exactly as the button does.
  The rule removes a misclick, not a penalty.
- **The other phases.** Space in `dir`, `power`, `flying` or `done` behaves as before; the
  rule only reads the `idle` phase, where the disc is at rest and the player is aiming.

## The Band Between the Circles

This spec was written against `GIMME_R = 1.5` tiles, when the two circles were 2.75 m and
7.5 m apart and the gap between them was a real decision: a 5 m putt is a shot a player
stands over, and clicking the button instead was giving something up.

The disc types spec then moved `GIMME_R` down to 0.8 tiles to meet the putter's floor, for
reasons that have nothing to do with this rule. The band survived the change arithmetically
— `AUTO_TAP_R` is still the smaller circle, and `canTapIn()` still holds — but it is now
2.75 m to 4 m, barely a metre wide. A putter throw inside it is legal and the button is
still offered, so nothing is broken; what is gone is the claim that the player is choosing
between two live options across a meaningful range.

Two honest ways out, neither taken yet because this is a feel question and the bag has not
been played against this rule:

- **Set `AUTO_TAP_R = GIMME_R`.** The key and the button agree everywhere, the sliver
  disappears, and the feature becomes "inside the gimme circle, space holes out". It costs
  the tie to the *drawn* ring, which is the thing that made the radius unarguable.
- **Keep the sliver and stop calling it a choice.** The rule stays tied to the circle the
  player can see, and the metre between the two is simply where the button still works.

The reason to write this down rather than resolve it here: the bag changed the number, and
the next spec to touch the gimme circle should find out that a second rule is hanging off
it instead of discovering it from a failing test.

## Feedback

The canvas prompt under the power bar reads `space to tap in` whenever the rule is armed,
in place of the aiming hint. That is the only signal the feature needs: the circle is
already drawn, the panel button is already showing, and the prompt line is where the player
is told what space does in every other phase.

## Test Notes

`sim.test.ts` covers the rule at the boundary — just inside `AUTO_TAP_R` holes out, just
outside it starts a charge — in both aiming modes, and pins that the auto tap-in counts a
stroke and that it cannot fire mid-flight.
