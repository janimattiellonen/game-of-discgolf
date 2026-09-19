---
name: vite-conventions
description: Vite project conventions — config, env vars, dev/build flow
applies_when:
  framework: [vite]
---

# Vite conventions

- Config lives in `vite.config.ts`. Plugins go in the `plugins` array, ordered with framework plugin first (e.g., `react()` before others).
- Env vars exposed to the client must be prefixed `VITE_`. Anything else stays server-side and is not bundled.
- Scripts: `pnpm dev` (dev server), `pnpm build` (production build), `pnpm preview` (preview build output).
- For dynamic imports of many modules, prefer `import.meta.glob` over manual lazy loading.
- HMR works automatically for React components — if it stops, suspect a non-default export or a side-effecting import.
