---
name: Tailwind v4 dark mode class
description: How to apply dark mode by default in Tailwind v4 — @apply dark is invalid
---

In Tailwind v4, `dark` is a custom variant defined by `@custom-variant dark (&:is(.dark *))`, NOT a utility class.
You cannot use `@apply dark` in CSS — this throws "Cannot apply unknown utility class `dark`".

**Rule:** To enable dark mode by default, add `class="dark"` directly to the `<html>` tag in `index.html`.

**Why:** The design subagent commonly writes `html { @apply dark; }` in index.css which crashes Vite's Tailwind plugin.

**How to apply:** Any time the app is dark-mode-by-default, check index.css for `@apply dark`, remove it, and add `class="dark"` to the html element.
