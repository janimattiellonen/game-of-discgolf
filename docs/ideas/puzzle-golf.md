# Game Of Discgolf — Puzzle Golf direction

## Problem Statement

How might we make disc golf feel like an adventure — each hole a hand-crafted puzzle of
water, sand, lava and monsters — while the player's entire input stays two simple timing bars?

## Recommended Direction

**Puzzle Golf.** The game is about *choosing a line*, not about reflexes. Each hole is a
legible dilemma: a safe route that costs a throw, and a greedy route that saves one if it
lands. The timing bars are how the player *prices and commits to* that choice, not a skill
test with a correct answer.

The pivotal change from the original intro: the power bar has **no correct spot**. Where you
stop it *is* your chosen distance, and accuracy scatter grows with power. A short layup is
near-deterministic; a max-power crossing of the lake has a wide cone of error. This makes
laying up a legitimate strategic choice and turns route-reading into the core loop. Direction
is chosen the same way — committed once, never adjusted mid-flight.

The player carries **three discs**, not a full bag: a fast straight driver, a disc that
finishes hard to one side (for curving around obstacles), and a floaty putter that lands
dead. Three is enough vocabulary for real decisions and few enough to stay legible. Wind
changes which disc a hole wants, so the same hole plays differently across rounds.

Obstacles are terrain, always. A monster is a moving obstacle on a legible patrol pattern —
a gator crossing the pond, so throw timing becomes another axis of the route decision. A
power-up is terrain that modifies a throw — a wind tunnel, a springboard — never an inventory
item. Nothing the player can fight, and nothing to manage between holes.

Holes are hand-authored as data, and instantly retryable. Twelve great holes beat eighteen
mediocre ones.

## Key Assumptions to Validate

- [ ] **Risk-priced power is fun, not frustrating.** Probabilistic scatter may read as
      "unfair" rather than "strategic." *Test:* prototype one hole with a single disc and
      scatter-on-power. Play it 20 times. Do you feel like you made a decision, or got cheated?
- [ ] **An isometric camera can communicate distance and elevation.** The whole route puzzle
      depends on judging "can I clear that water?" from a bird's view. Isometric projection is
      bad at depth by nature. *Test:* render one hole with water and a raised basket; can you
      judge the crossing without a number on screen? Landing-spot indicators and shadows are
      the likely fixes — validate before committing to the art style.
- [ ] **Hand-authoring holes stays enjoyable.** If building hole #4 is a chore, the project
      stalls. *Test:* after the editor/format exists, build four holes in one sitting and
      notice whether it felt like play or work.
- [ ] **Wind adds decisions rather than noise.** Wind the player cannot plan around is just
      randomness. *Test:* same hole, same line, three wind states — does the right disc change?

## MVP Scope

**In:**
- One hole, played end to end: teepad → throw → disc flight → landing → next throw → basket.
- One disc. Direction bar + power bar, power drives both distance and scatter.
- Flat terrain plus exactly one obstacle type (water) with a stroke penalty.
- Isometric tile rendering with a landing-spot indicator and a disc shadow.
- Throw counter and par.
- Hole defined in a data file, not hardcoded — the format a generator could someday emit.

**Out of MVP:** everything else, including the second and third disc, wind, elevation,
monsters, power-ups, multiple holes, and a scorecard.

The MVP exists to answer assumptions 1 and 2. If risk-priced throwing isn't fun, or the
camera can't convey distance, the rest of the design is worthless — so nothing else gets
built until those two are settled.

## Not Doing (and Why)

- **Procedural hole generation** — solves the real content bottleneck, but you can't tune a
  generator against a definition of "good hole" you haven't discovered yet. Revisit after
  ~10 hand-built holes. Keep the hole data format generator-friendly in the meantime.
- **Realistic disc flight physics (HSS/LSS, fade, turn)** — this is an adventure game. A
  simulation-grade flight model fights the puzzle framing and burns weeks on a system
  players can't read from an isometric camera anyway.
- **Mid-flight disc control** — would collapse the route puzzle into a reflex game. The
  commitment *is* the decision.
- **Monsters as enemies (combat, chasing, health)** — that's a second game. Monsters stay
  moving obstacles with legible patterns.
- **Power-ups as inventory** — an item system adds management overhead between throws and
  breaks "the hole in front of you is the whole puzzle."
- **Accounts, backend, multiplayer, leaderboards** — single-player, client-side, no server.
- **18 holes** — content is the bottleneck, not ambition. Target 9, ship whatever is good.

## Open Questions

- Does the direction bar also carry risk, or only power? (Two sources of scatter may be one
  too many to read.)
- How is the "cone of error" shown to the player *before* they commit? Without visible risk,
  the trade-off is invisible and the puzzle disappears.
- What does failure cost — stroke penalty, re-throw from the water's edge, or throw again
  from the previous lie? This sets how punishing the greedy line feels.
- Fixed camera angle, or player-rotatable? Rotation helps depth perception (assumption 2)
  but multiplies the tile art.
- Tech stack: engine (Phaser, PixiJS, bare Canvas/WebGL) is still open and should be chosen
  against the isometric-rendering needs, not by default.
