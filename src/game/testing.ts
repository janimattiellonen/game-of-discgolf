import { expect } from 'vitest';

/**
 * Test-only helpers. Nothing under src/ imports this outside a *.test.ts file, and the
 * Vitest `include` glob only picks up *.test.ts, so this is never collected as a suite.
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
