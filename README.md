# Game of Disc Golf

Vite + React 19 + TypeScript. The game itself is framework-agnostic; React only provides
the menus and panels around it.

```sh
nvm use
pnpm install
pnpm dev        # http://localhost:5173
```

| script                         | what it does                 |
| ------------------------------ | ---------------------------- |
| `pnpm dev`                     | dev server on port 5173      |
| `pnpm build`                   | typecheck + production build |
| `pnpm typecheck`               | `tsc --noEmit`               |
| `pnpm lint` / `lint:fix`       | oxlint                       |
| `pnpm format` / `format:check` | prettier                     |

## Layout

```
src/
  game/          # zero React imports - runs without a framework
    scale.ts     # TILE_M, metres <-> tiles, course classes
    course.ts    # the hole: grid, tee, basket, terrain
    discs.ts     # the bag: putter, midrange, driver, and the effort curve
    constants.ts # scatter, overcharge, flier, skid and basket tuning
    math.ts      # vectors, gauss, clamp
    physics.ts   # flight, skid, basket cylinder, OB last-crossing
    sim.ts       # game state, phase machine, throw resolution
    render.ts    # draws to a CanvasRenderingContext2D it is handed
    index.ts     # createGame(canvas) - the public API
    montecarlo.test.ts  # `pnpm sim` - measures the tee shot, skipped by default
  ui/            # React: panel, disc picker, mode picker, tap-in button
  styles/        # design tokens
```

**The boundary matters.** `src/game` never imports React, and the 60fps loop never goes
through `useState` — it reads simulation state directly. React receives a `Snapshot` at
~10Hz (and immediately on phase changes), which is enough for a side panel and keeps
rendering out of the frame budget. Live values that change every frame, like the power bar,
are drawn on the canvas.

`createGame(canvas)` returns `start`, `stop`, `subscribe`, `bindKeys`, `reset`, `tapIn`,
`setMode`, `setDisc` and `toggle`. Anything that can hand it a canvas can run the game.

**How far the disc goes is a property of the disc**, not of the player and not of the course.
`discs.ts` holds the bag as a data table authored in metres and derived to tiles, and scatter
is keyed to the distance of the throw rather than to the power bar — with per-disc ranges the
bar means different things on different discs, and keying scatter to it makes the driver the
_accurate_ disc at short range.

## Styling

Native CSS / CSS Modules. Component-scoped styles go in `*.module.css`; global styles and
design tokens in `src/styles/global.css`.

## Reference

`prototypes/throw-feel.html` is the original single-file prototype this was ported from.
It is kept until the ported version is confirmed to feel identical.
