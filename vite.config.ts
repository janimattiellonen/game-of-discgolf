import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    // src/game/ is plain TypeScript with no DOM in it, so the tests need no browser
    // environment. Anything that does (render.ts, createGame) is deliberately untested.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
