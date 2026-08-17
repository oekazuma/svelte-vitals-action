---
'@svelte-vitals/action': patch
---

Update the bundled analyzer to `svelte-vitals` 0.48.1 / `@svelte-vitals/core` 0.45.0, and take the report and gating functions from `@svelte-vitals/core`'s stable entry now that they are exported there.

Nothing the action reports changes: no rule, severity, score, annotation, job summary or sticky-comment output moves. The promotion upstream is a pure re-export, and the four functions this action calls — `formatGithubReport`, `formatMarkdownReport`, `summarize`, `hasFailureAtOrAbove` — keep the same signatures and behaviour.

What changes is the promise behind them. They previously came from `@svelte-vitals/core/internal`, which upstream excludes from semver and may reshape in any release including a patch, so a dependency bump could break this action's committed bundle with only its own CI typecheck standing in the way. They now come from an entry covered by semver.
