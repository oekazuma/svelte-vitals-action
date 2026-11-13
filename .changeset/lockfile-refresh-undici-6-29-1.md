---
'@svelte-vitals/action': patch
---

Refresh the lockfile. `svelte-vitals` and `@svelte-vitals/core` stay at 0.55.5, so no rule, severity, score or report output changes. The bundle consumers run is still rebuilt on newer transitive dependencies, which is why this ships as a release rather than passing unnoticed.

What moved inside it: `undici` 6.29.0 → 6.29.1 behind the sticky PR comment, and `acorn` 8.18.0 → 8.19.0 underneath the analysis.
