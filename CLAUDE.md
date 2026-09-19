# Game of Disc Golf

## Read the conventions before writing code

Load the `project-conventions` skill before implementing anything under `src/`.
It carries the rules a linter cannot: what belongs in the simulation and what
belongs in the React layer, whether a value is drawn on the canvas or published
on a `Snapshot`, why distances stay in tiles, and where design tokens live.

The one rule that outranks all of it: **`src/game/` never imports React.** The
simulation is a plain TypeScript module that draws to a `CanvasRenderingContext2D`
it is handed, and `createGame(canvas)` in `src/game/index.ts` is its whole public
API. React lives in `src/ui/` and receives a `Snapshot` at ~10Hz — the 60fps loop
never goes through `useState`. A React import inside `src/game/` is not a style
slip, it is the boundary collapsing, and nothing in the lint setup will catch it.

Feature work also needs a spec. Specs live in `specs/`, one Markdown file per
feature, named `YYYY-MM-DD-topic.md` and opening with a **Status** line that says
how much of it is real — see
`specs/2026-09-19-course-measurement-and-hole-classification.md`. Write or update
the spec **before** implementing, and check it against the code once `pnpm check`
is green.

`docs/`, `prompts/`, `reports/` and `specs/` are prose, hand-wrapped and excluded
from Prettier on purpose. Do not reformat them.

## Before you say it is done

- `pnpm check` — typecheck, then oxlint, then `prettier --check`, then the Vitest
  suite. One command, fail-fast, and it is the same one CI would run. `pnpm test`
  is the watch mode for while you work.
- `pnpm build` **if you touched `vite.config.ts`**. `pnpm check` typechecks only
  `tsconfig.app.json`, which covers `src/` and nothing else; the config file lives
  in `tsconfig.node.json` and is checked only by the `tsc -b` inside the build. A
  type error there passes `pnpm check` and fails the build.
- **Run it anyway.** The suite covers the pure layer of `src/game/` — the tuning
  curves, the skid integrator, the course geometry — and it covers none of the
  feel. `pnpm dev` and throw a few discs is still the only evidence that a change
  to `physics.ts`, `sim.ts` or `constants.ts` did what you meant. Green tests
  prove the numbers held, not that the disc flies.
- New work in `src/game/` gets tests, written first. The test sits beside the
  code — `physics.ts` → `physics.test.ts` — and the `tests` skill has the rules.
  `render.ts` and `createGame()` are deliberately not covered: canvas drawing and
  the rAF loop have nothing worth asserting short of pixel snapshots.
- If you changed the feel — scatter, overcharge, skid, the basket — compare
  against `prototypes/throw-feel.html`. It is the reference the port is still
  being judged against, so "different" is a finding that needs saying out loud,
  not a detail to absorb quietly.
- The spec: re-read the **whole** document you edited, not only the paragraphs you
  changed. A spec that contradicts itself two sections later is worse than one
  that was never updated.
