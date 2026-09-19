import { expect } from 'vitest';

/**
 * Test-only helpers, kept outside src/game/ because that module ships: createGame() is
 * the app's entry into it and must not be able to reach a test framework.
 *
 * This file and *.test.ts are the only places in src/ allowed to import vitest, and that
 * is enforced by the no-restricted-imports override in .oxlintrc.json rather than by this
 * comment. The Vitest `include` glob only collects *.test.ts, so this is never run as a
 * suite.
 */

/** Asserts a sampled curve never turns back on itself. */
export function expectAscending(values: number[]): void {
  expect(values).toEqual([...values].sort((a, b) => a - b));
}

/** Samples a tuning curve evenly across the power bar, endpoints included. */
export function acrossThePowerBar<T>(fn: (p: number) => T): T[] {
  const steps = 20;
  return Array.from({ length: steps + 1 }, (_, i) => fn(i / steps));
}
