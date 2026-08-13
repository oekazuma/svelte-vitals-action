---
'@svelte-vitals/action': patch
---

Update the bundled analyzer to `svelte-vitals` 0.46.0 / `@svelte-vitals/core` 0.42.0. Nothing the action reports changes: no rule severity, score, finding, annotation, job summary or sticky-comment output moves. Upstream's visible work in this range is CLI-only (shell completion, spinner cursor restore, the `ci install` workflow scaffold, and the dispatch layer's exit code), and the rest is internal refactoring plus two new library exports the action does not use yet.
