---
name: project-conventions
description: Project architecture and code conventions — the game/React boundary, the Snapshot contract, tile vs. metre units, tuning constants, CSS Modules and file organisation. Note that feature work also requires a spec in specs/.
user-invocable: false
---

# Project conventions

## The boundary is the architecture

`src/game/` is plain TypeScript and **never imports React**. It draws to a
`CanvasRenderingContext2D` it is handed, and `createGame(canvas)` in
`src/game/index.ts` is its entire public API — `start`, `stop`, `subscribe`,
`bindKeys`, `reset`, `tapIn`, `setMode`, `toggle`. Anything that can produce a
canvas can run this game; React is one caller, not the host.

A React import inside `src/game/` is not a style slip, it is the boundary
collapsing, and no lint rule here will catch it.

The bridge is `useGame()` in `src/ui/GameCanvas.tsx`, and it is the only one. It
creates the game, subscribes, binds keys, and tears all three down on unmount.
Do not create a second bridge; if the UI needs something new from the core, widen
the contract instead.

## The Snapshot contract

React never reads `GameState`. It receives a `Snapshot` — plain values only,
defined at the top of `src/game/index.ts` — published on every phase change and
otherwise at ~10Hz. The 60fps loop must never go through `useState`.

This is a frame-budget rule, so it decides where a value belongs:

- Changes every frame and the player watches it move — the power bar, the aim
  cone — **draw it on the canvas**, where it costs nothing.
- Read at a glance, a few times a second — throws, penalties, distance, σ values
  — **put it on `Snapshot`** and let the panel render it.

Adding a field to `Snapshot` means adding it to the interface and to `snapshot()`
below it. Keep the two in the same order.

## Units: tiles in the model, metres on screen

Every position and distance in the simulation is in continuous **tile**
coordinates, Euclidean. `TILE_M` in `src/game/scale.ts` is the one constant that
turns the board into a real course.

**Metres are a display unit only.** Convert at the edge with `m()` when building
a `Snapshot` or rendering a label — never in the physics, where it would only add
rounding noise. `tl()` converts back when a real-world figure has to enter the
model.

## Tuning constants live in constants.ts, with the reason

Scatter, overcharge, skid and basket numbers belong in `src/game/constants.ts`,
not inline in `physics.ts` or `sim.ts`. They are grouped under banner comments
(`// ---- scatter`, `// ---- input`) and the non-obvious ones carry a comment
explaining the _design_ intent — why the bar runs 1% past full, why angular
scatter is clamped so a shank still goes forward.

A magic number in the physics with no name and no reason is the thing this
project is most likely to regret. If you cannot say why a constant has its value,
that is worth writing down before the value is.

## React layer

`src/ui/` holds the panel, the mode picker and the tap-in button. Components take
props and render; they reach the core only through the `Game` handle they are
given (`game?.tapIn()`, `game?.setMode(...)`). No component imports from
`src/game/` internals — only from `src/game` itself, which re-exports the public
types.

`src/App.tsx` is the wiring layer: it calls `useGame()`, sizes the canvas, and
renders `<Panel>`. Keep it that thin.

## Styling

Native CSS and CSS Modules. Component-scoped styles go in a sibling
`*.module.css`; global styles and design tokens go in `src/styles/global.css`.

Colours come from the tokens in `:root` — `--bg`, `--panel`, `--text`, `--muted`,
`--line`, `--accent`, `--accent-cool`, `--key`. Before hardcoding a hex value,
check whether a token already means what you want, and add one if the colour is
going to be reused.

Canvas rendering is the exception: `src/game/render.ts` draws with its own
literals, because it has no stylesheet to read.

## File organisation: important code first

- Exported API — functions, types, constants — before implementation details.
- In React component files, the component function at the top, small helper
  components (`Row` in `Panel.tsx`) below or above it as reads best, and the
  style import at the top with the other imports.

## Specs come first

Every major feature has a specification in `specs/`, one Markdown file named
`YYYY-MM-DD-topic.md`, opening with a **Status** line that says honestly how much
of it is real — see
`specs/2026-09-19-course-measurement-and-hole-classification.md`.

Write or update the spec **before** implementing or changing behaviour, and
verify it against the code once `pnpm check` is green. When you edit a spec,
re-read the whole document, not only the paragraphs you changed.

## Prose is not Prettier's business

`docs/`, `prompts/`, `reports/`, `specs/` and `prototypes/` are excluded in
`.prettierignore` on purpose — they are hand-wrapped. Do not reformat them.

`prototypes/throw-feel.html` is the original single-file prototype this was ported
from. It stays until the port is confirmed to feel identical, so do not "clean it
up" and do not fix bugs in it — it is the reference, not live code.
