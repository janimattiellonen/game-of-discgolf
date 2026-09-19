---
name: code-review-checklist
description: Five-axis code review checklist (correctness, readability, architecture, security, performance) — run before merging
applies_when:
  always: true
---

# Code review checklist

Before merging, verify across five axes.

1. **Correctness** — does it do what the spec says? Edge cases handled? Tests cover the change?
2. **Readability** — will a teammate understand this in six months without explanation? Are names accurate? Is intent obvious from the code alone?
3. **Architecture** — does it fit existing patterns? Are abstractions earning their cost? No premature generalization?
4. **Security** — input validation at boundaries? No secrets in code? OWASP top-10 considered for user-facing surfaces?
5. **Performance** — no accidental O(n²)? No needless re-renders? Database queries indexed?

Run `pnpm lint`, `pnpm typecheck`, and the test suite before requesting review.
