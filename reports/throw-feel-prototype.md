# Throw-feel prototype — report

**Date:** 2026-09-18
**Artifact:** `prototypes/throw-feel.html` (throwaway, self-contained, no build, no deps)
**Related:** `docs/ideas/puzzle-golf.md`

## What this prototype is for

It exists to answer two questions before any architecture is written:

- **Q1** — Is risk-priced power fun rather than frustrating? (Power sets distance *and*
  scatter; there is no "correct spot" on the bar.)
- **Q2** — Can an isometric camera communicate distance and elevation well enough to judge
  "can I clear that water?"

## How to run it

Double-click the file, or:

```
open prototypes/throw-feel.html
```

**Controls**

| Key | Action |
|---|---|
| `space` | cycles aim-direction → aim-power → throw |
| `R` | reset hole |
| `1` | toggle landing cone |
| `2` | toggle disc shadow |
| `3` | toggle distance rings |
| `4` | toggle elevation shading |

Toggles `1`–`4` exist specifically to test Q2 — turn the aids off and see whether the raw
isometric view is still readable.

**The hole.** Tee bottom-left, basket on a raised plateau top-right, a water band across the
fairway with a land bridge on the right. The direct line is a risky carry; the right side is
safe but costs a throw. Water is +1 stroke and a rethrow from the same lie.

## Finding: the first version could not answer its own question

A Monte Carlo run against the model (in-page, using the real constants) showed that from the
tee, clearing the water was **geometrically impossible** — max carry was 9 tiles, the crossing
needed 12. Best case was 18% clear against 58% wet, so going around was strictly correct at
every power setting.

Risk pricing with no viable gamble is not a decision, it is a tax. The prototype would have
"answered" Q1 with a false negative.

**Retuned** to a max carry of 11 tiles and a 2-tile water band:

| Power | Clears | Wet | Left to basket if cleared |
|---|---|---|---|
| 70%  | 19% | 56% | 8.6 tiles |
| 85%  | 41% | 40% | 7.3 tiles |
| 100% | 55% | 27% | 6.2 tiles |

That shape is worth playing: commit fully or go around, and half-power is the worst of both
options. Whether it *feels* like a decision or like a slot machine is the part only a human
can answer.

A second, smaller fix: the initial isometric projection overflowed the canvas on both sides
(grid width 1088px vs. an 980px canvas). Tile size reduced to 56×28 and the origin moved.

## What was verified, and what was not

**Verified in a real browser:** the page renders, keyboard input works, the direction and
power sweeps run, the landing cone draws and scales with power, and nothing throws.

**Not verified:** the feel — that is the whole point of handing it over.

**One genuine gap:** in browser automation the tab ran backgrounded, where Chrome throttles
`requestAnimationFrame` to zero, so the disc froze mid-flight at `visibilityState: "hidden"`.
That is a harness artifact rather than a bug — but it means **the flight animation and the
landing transition are the one code path never watched end to end.** If a throw hangs in the
air during real play, that is a real defect and this report cleared it wrongly.

## What to watch for while playing

- **Q1** — After a wet throw at full power, did it feel like a bad bet you made, or like the
  game cheated you? The cone is meant to make the risk visible *before* you commit; check
  whether you actually read it, or just mashed space.
- **Q2** — Play a few holes, then press `3` and `2` to kill the rings and the shadow. If you
  can no longer judge the carry, isometric alone cannot carry the design, and the aids become
  mandatory rather than optional — a real constraint on the art direction.

## Next step

Report back how it felt. The verdict gets folded into `docs/ideas/puzzle-golf.md` (assumptions
1 and 2) before anything moves toward a spec.
