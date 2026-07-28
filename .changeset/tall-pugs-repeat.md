---
'@svelte-vitals/action': minor
---

Update the bundled analyzer to `svelte-vitals` 0.34.0 / `@svelte-vitals/core` 0.30.0. The action's inputs and outputs are unchanged — what changes is what the scan reports:

- Two new `correctness` rules. `correctness/base-path-navigation` flags hardcoded root-relative navigation (`<a href="/about">`, `goto('/about')`, `redirect(303, '/login')`) in projects that set `kit.paths.base`, where it 404s in production; `correctness/checkable-bind-value` flags `bind:value` on `<input type="checkbox">` / `<input type="radio">`, where the bound state silently never updates.
- Recalibrated Architecture thresholds: `architecture/prop-count` now flags more than 6 props (was 10) and `architecture/component-size` more than 200 lines (was 400). Expect new `info` findings on existing projects. Nothing new fails by default (`failOn` defaults to `critical`), but a repo running `failOn: 'info'` can start failing on components that passed before.
- New opt-in rule `architecture/private-scope-import`, inert until `scopes` is configured.
- Rule settings accept an object form, `{ severity, options }`, so a project can move a configurable rule's thresholds or extend its built-in lists from `svelte-vitals.config.*` — including the two recalibrated Architecture thresholds. Values in `rules` are now validated: an invalid severity that was previously ignored is a fatal config error, and the action's step fails on it.
- Fewer false positives across the component-analysis rules: writes to `{@const ...}` / `{let ...}` / `{const ...}` template locals are no longer misattributed to a same-named top-level `$state`.
