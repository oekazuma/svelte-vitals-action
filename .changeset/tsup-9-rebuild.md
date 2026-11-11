---
'@svelte-vitals/action': patch
---

Rebuild the bundle with `tsup` 9 (`esbuild` 0.27.7 → 0.28.2). `svelte-vitals` and `@svelte-vitals/core` stay at 0.55.2 and no runtime dependency moves, so no rule, severity, score or report output changes. The emitted `dist/index.js` still differs: identifiers are renamed throughout, and the CommonJS interop helper now resets a module whose initialization throws so a later `require` retries it instead of returning a half-initialized export.
