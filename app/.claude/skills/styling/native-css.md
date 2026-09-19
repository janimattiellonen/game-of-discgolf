---
name: native-css-conventions
description: Native CSS / CSS Modules conventions
applies_when:
  styling: [native-css]
---

# Native CSS conventions

- Use CSS Modules (`*.module.css`) for component-scoped styles. Plain `.css` for global styles only.
- Define design tokens as CSS custom properties on `:root` in a single `global.css`.
- Use logical properties (`margin-inline`, `padding-block`) for better RTL support.
- Avoid deeply nested selectors — flat is better than clever.
- One `*.module.css` per component, colocated with the component file.
