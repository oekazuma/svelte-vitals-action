# @svelte-vitals/action

## 0.7.0

### Minor Changes

- e3216c2: Update the bundled analyzer to `svelte-vitals` 0.39.0 / `@svelte-vitals/core` 0.34.0. The action's inputs and outputs are unchanged, and so is what makes the step fail — the gate still keys on `failOn` severity, not on any score. What changes is the numbers the report prints and what the scan reports:

  - **Category scores now measure how much is wrong, not merely that something is.** A key used to start at 100 and lose fixed points per failing rule, which capped what a category could express and flattened one finding against several hundred. A key now scores the share of what it was measured against that is intact, weighted by severity, so every category can reach 0. Any category carrying a finding moves in the summary and the sticky PR comment, most of them downward and by more than a point; `architecture`, `security` and `performance` move furthest, `seo` and `correctness` stay within a point. A clean 100 still means no finding among the checks that ran, and a `critical` still caps a category at 79. Anything reading the Health number out of the job summary should be recalibrated against the new scale.
  - `security/handler-state-write`, on by default, now reports a hand-rolled in-memory store under `$lib/server`. The `.set()`/`.update()` exemption for that directory was path-based, so a shared `new Map()` overwritten by every request was exempt alongside the database clients it was meant to cover. The export's initializer is now read: a `Map`/`Set`/`WeakMap`/`WeakSet` or an object or array literal is reported, anything else stays exempt. Existing projects may see new findings here.
  - New opt-in rule `architecture/doc-link-target` reports a documentation link in a component comment whose target no longer exists. Inert until you declare `urlRoots`, so it adds nothing to a scan until configured.

## 0.6.0

### Minor Changes

- ca45599: Update the bundled analyzer to `svelte-vitals` 0.37.0 / `@svelte-vitals/core` 0.31.1. The action's inputs and outputs are unchanged — what changes is what the scan reports and the numbers it prints:

  - **Scores are now floored instead of rounded**, so a reported 100 means the deduction was exactly zero. Every category score and Health can move down by one point, and Health is computed from unrounded category scores (the old double rounding could move it two). A workflow gating on the summary's Health number should expect it a point lower.
  - One new rule **on by default**: `architecture/route-component-import` reports a component importing a SvelteKit route entry (`+page.svelte`, `+layout.svelte`, `+error.svelte`, and their `@` breakout forms). Existing projects may see new `info` findings; stories, tests and specs are exempt.
  - Three new opt-in Architecture rules, inert until configured: `architecture/unit-entry-file`, `architecture/directory-naming`, `architecture/reserved-directory-names`.
  - Import specifiers now resolve through the aliases a project declares in `svelte.config.{js,ts}` (`kit.alias`, and `kit.files.lib` when `$lib` has been moved). Projects importing through their own aliases will see findings that were previously invisible — `security/shared-state-import` in particular was inert for them.
  - Fewer false positives: `performance/heavy-import` no longer reports type-only imports, which are erased at build.

## 0.5.0

### Minor Changes

- 7ccb121: Update the bundled analyzer to `svelte-vitals` 0.34.0 / `@svelte-vitals/core` 0.30.0. The action's inputs and outputs are unchanged — what changes is what the scan reports:

  - Two new `correctness` rules. `correctness/base-path-navigation` flags hardcoded root-relative navigation (`<a href="/about">`, `goto('/about')`, `redirect(303, '/login')`) in projects that set `kit.paths.base`, where it 404s in production; `correctness/checkable-bind-value` flags `bind:value` on `<input type="checkbox">` / `<input type="radio">`, where the bound state silently never updates.
  - Recalibrated Architecture thresholds: `architecture/prop-count` now flags more than 6 props (was 10) and `architecture/component-size` more than 200 lines (was 400). Expect new `info` findings on existing projects. Nothing new fails by default (`failOn` defaults to `critical`), but a repo running `failOn: 'info'` can start failing on components that passed before.
  - New opt-in rule `architecture/private-scope-import`, inert until `scopes` is configured.
  - Rule settings accept an object form, `{ severity, options }`, so a project can move a configurable rule's thresholds or extend its built-in lists from `svelte-vitals.config.*` — including the two recalibrated Architecture thresholds. Values in `rules` are now validated: an invalid severity that was previously ignored is a fatal config error, and the action's step fails on it.
  - Fewer false positives across the component-analysis rules: writes to `{@const ...}` / `{let ...}` / `{const ...}` template locals are no longer misattributed to a same-named top-level `$state`.

## 0.4.1

### Patch Changes

- 18bbb18: Added `branding` (icon/color) to `action.yml` — required by GitHub before the action can be published to the GitHub Marketplace.

## 0.4.0

### Minor Changes

- Migrated out of the [svelte-vitals](https://github.com/oekazuma/svelte-vitals) monorepo into this dedicated repository, following the same pattern as `changesets/action`, `pnpm/action-setup`, and `renovatebot/github-action`. This repo's `svelte-vitals`/`@svelte-vitals/core` dependencies are now regular npm-registry semver ranges (not workspace-linked), and its git tags are plain `vX.Y.Z` — Renovate's built-in `github-actions` manager now works out of the box for consumers, with no custom configuration needed. Continues the version series from the old `@svelte-vitals/action@0.3.8`.

  **Breaking:** the action reference changes from `oekazuma/svelte-vitals/packages/action@<sha>` to `oekazuma/svelte-vitals-action@<sha>`. Re-run `npx svelte-vitals@latest ci install --force` (or `ci upgrade`) to update an existing workflow.
