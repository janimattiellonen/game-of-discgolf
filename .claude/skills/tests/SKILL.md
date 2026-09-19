---
name: tests
description: Testing conventions and guidelines — test structure, patterns to enforce, anti-patterns to flag, and design principles for testable code. Use when writing tests, reviewing test code, or creating new functionality that needs tests.
user-invocable: false
---

# Tests

- Generate tests for new functionality

## Pure functions over side effects

- Extract business logic into pure functions that take inputs and return outputs
- Keep side effects (API calls, DOM manipulation, localStorage) at the edges
- Loaders and actions in Remix should be thin — delegate logic to testable utility functions

## Dependency injection over direct imports

- Pass dependencies as function arguments or React context rather than importing them directly
- This makes it easy to swap real implementations for test doubles

## Small, focused functions

- Each function should do one thing

## Validation logic as standalone functions

- Extract form validation into pure functions
- These are trivial to unit test with various input combinations

## Patterns to enforce

- No business logic inside useEffect — extract into functions or custom hooks
- No inline complex calculations in JSX — extract into named functions or variables
- Avoid deeply nested conditionals — use early returns and guard clauses
- Prefer explicit return types on exported functions (acts as a contract for tests)
- Co-locate test files next to source: Component.tsx + Component.test.tsx

## Anti-patterns to flag

- Components that fetch data, transform it, and render it all in one place
- Functions that depend on global or module-level mutable state
- Tightly coupled components that can't render without their parent's context
- any types that hide the actual data shape (makes tests unreliable)
- Mocking too many things — if a test needs 5+ mocks, the code needs refactoring

## Test structure

- Arrange-Act-Assert pattern in every test
- One assertion per logical concept (multiple expect calls are fine if they test the same behavior)
- Test names describe behavior, not implementation: "returns empty array when no active admins" not "test filterActiveAdmins"
- Test edge cases: empty inputs, null/undefined, boundary values

## TDD — red, green, refactor

- RED: write failing test FIRST. run it. watch it fail for the right reason.
- GREEN: minimal code to pass. nothing extra.
- REFACTOR: tidy. tests stay green.
- no impl code before a failing test exists.
- test sits beside code: `foo.ts` -> `foo.test.ts`.
- run the test before calling it done (backend cmd below). hooks nudge, they don't replace this.
