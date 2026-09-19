---
name: typescript-strict
description: Strict TypeScript conventions — no any, no non-null assertions without justification, prefer unknown over any
applies_when:
  always: true
---

# TypeScript strict conventions

- `tsconfig.json` should have `"strict": true`. Don't disable individual strict flags without a comment explaining why.
- Avoid `any` — use `unknown` and narrow.
- Avoid non-null assertions (`x!`). Either handle the null case or refactor so the type system sees it as non-null.
- Prefer `as const` over manual literal-type unions.
- Use discriminated unions over boolean flags when state has mutually-exclusive shapes.
- Don't use enums — use `as const` objects with a derived union type.
