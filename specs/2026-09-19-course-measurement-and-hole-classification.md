# Course Measurement and Hole Classification

**Status:** partially implemented in `prototypes/throw-feel.html`
**Date:** 2026-09-19

## Problem Statement

The prototype measures everything in abstract "tiles". That is fine for testing throw feel,
but it cannot answer the question a course designer has to answer first: *how long is this
hole, and who is it for?* Real courses are graded by average hole length — a beginner layout
averages under 60 m, an elite layout over 140 m. Without a metre scale there is no way to
author a beginner hole, an intermediate hole and a pro hole and know they are different.

This spec defines the measurement system that turns the board into a course.

## The Scale

One constant defines everything:

```js
const TILE_M = 5;                          // metres per tile side
const TILE_DIAG_M = TILE_M * Math.SQRT2;   // 7.07 m corner to corner
```

All positions in the model are continuous tile coordinates and all distances are Euclidean
(`Math.hypot`). A tile is therefore `TILE_M` across its sides and `TILE_M * sqrt(2)` corner
to corner with no extra code — the diagonal is a consequence of the coordinate system, not a
separate rule.

**Metres are a display unit only.** The physics stays in tiles. Converting the model itself
would add rounding noise to the flight, skid and scatter calculations for no benefit.

Conversions: `m(tiles)` and `tl(metres)`.

## Hole Length

```js
const holeLength = () => m(Math.hypot(BASKET.x - TEE.x, BASKET.y - TEE.y));
```

Straight-line tee pad to basket. This is the standard way a hole's length is published, and
it deliberately ignores the route the player actually has to take — a dogleg around water
plays longer than it measures, and that gap *is* the design of the hole.

## Course Classes

Graded by **average** hole length across the course, matching how real courses are rated:

| Class | Average hole length |
|---|---|
| beginner | ≤ 60 m |
| recreational | ≤ 85 m |
| intermediate | ≤ 110 m |
| advanced | ≤ 140 m |
| pro | > 140 m |

```js
const classOf = metres => CLASSES.find(c => metres <= c.max).name;
```

A real course has 9 or 18 holes. `classOf` currently grades a single hole; when a course
exists it must be given the course average, not a per-hole value, or a short hole on a pro
course will be mislabelled.

## Player Skill

Skill is an arm length in metres, separate from board size:

```js
const DRIVE_M = 55, PUTT_M = 7.5;           // full power / minimum throw
const MIN_D = tl(PUTT_M), MAX_D = tl(DRIVE_M);
```

Reference drives: beginner ~55 m, intermediate ~90 m, advanced ~110 m, pro 130 m+.

`TILE_M` says how big the board is. `DRIVE_M` says who the player is. They must move
together — changing tile size alone rescales the throw as well as the hole.

## Current Hole, Measured

| Property | Value |
|---|---|
| Tee to pin | 16.64 tiles = **83 m** |
| Class | recreational, par 3 |
| Board | 20 × 14 tiles = 100 × 70 m |
| Throw range | 7.5 m (putt) to 55 m (full power) |
| Water band | 10 m wide |
| Plateau height | 3 units = 15 m (see open question 3) |

The player cannot reach the pin in one throw — 83 m against a 55 m drive. That is what makes
the water carry a real dilemma, and it is worth preserving as holes are authored: a hole
whose length is under one drive has no route decision in it.

## Open Questions

1. **A pro-length hole does not fit the board.** A 130 m drive is 26 tiles; `GW` is 20. The
   grid must become per-hole data rather than fixed constants before the upper classes can
   be built. This is the blocking item for authoring a course.

2. **The basket is not a physical object.** At the current scale `CATCH_R = 0.55` tiles is a
   **2.75 m catch radius** and `CATCH_H = 1.7` is an **8.5 m cage**. A real basket is ~0.33 m
   across and 1.35 m tall. `GIMME_R` is a 7.5 m "tap-in". These were tuned as gameplay
   targets against tile granularity and the scatter model — at true size they would be
   unhittable. Decide deliberately whether the basket is a game target or an object, because
   the tension gets worse as more holes are added.

3. **Elevation has no metric meaning.** `HZ` is pixels per elevation unit with no metre
   value. Read against `TILE_M` the plateau is 15 m tall, which is a cliff, not a hill.
   Elevation needs its own scale constant.

4. **Par is hardcoded to 3.** Par should derive from hole length against the player's drive,
   the way real courses assign it.

## Acceptance Criteria

Implemented:

- [x] A single `TILE_M` constant defines the metre scale; side and diagonal both derive.
- [x] Hole length is computed tee-to-pin and displayed in metres.
- [x] Course classes are defined with the standard bands and a `classOf` lookup.
- [x] All player-facing readouts are in metres: distance to basket, throw distance, distance
      scatter, ring labels, landing and OB log messages.
- [x] Throw range is expressed as an arm length in metres (`DRIVE_M`, `PUTT_M`) with no
      change to the tuned tile values.

Not yet implemented:

- [ ] Grid dimensions, tee and basket are per-hole data rather than module constants.
- [ ] A course is a list of holes; class is computed from the course average.
- [ ] Par derives from hole length rather than being a constant.
- [ ] An elevation scale in metres.

## Out of Scope

Throw physics (scatter, skid, overcharge), the OB rule, aiming modes and basket catch
behaviour are all unchanged by this spec. It defines how the board is *measured*, not how
the disc behaves.
