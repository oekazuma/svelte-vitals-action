# @svelte-vitals/action

## 0.9.0

### Minor Changes

- 9f513e6: Update the bundled analyzer to `svelte-vitals` 0.45.1 / `@svelte-vitals/core` 0.41.1, a wide range covering several upstream releases. The action's inputs and outputs are unchanged, and the step still fails on `failOn` severity rather than on any score — but that severity table itself moved, so read the first two entries before upgrading a workflow you rely on:

  - **The default gate loosens: `seo/description-presence` drops from `critical` to `warning`.** Under the default `failOn: critical`, a project whose only failure was a missing `<meta name="description">` now passes the step where it used to fail it. If you were relying on that block, set `failOn: warning` or override the rule's severity in your config. Three more severities moved, and they only bite under a non-default `failOn: warning`: `seo/og-url` `info` → `warning` (the one tightening — a previously green run can turn red), `seo/og-description` `warning` → `info`, and `seo/single-h1` splitting per finding so that two or more `<h1>` is now `info` while a missing one stays `warning`. The `seo::route` scoring pair's total weight drops from 110 to 100 as a result, so SEO and Health can shift a point or two with no finding change at all.
  - **A previously green run can turn red from files that were never analyzed.** A parse crash on argument-less `$state()` — `let el = $state();`, the idiomatic `bind:this` declaration — used to make the whole component invisible to every rule, silently. Those files are analyzed now, and what surfaces in them can include `critical` findings that fail the default gate. That is the fix working.
  - **A rule that throws no longer fails the whole step.** The run completes without that rule and its weight is removed from the Health denominator, so the score is not silently inflated. Previously the exception propagated and the action failed the job outright. Note the tradeoff: the action does not yet surface the analyzer's non-fatal warnings, so the skipped rule's id is not reported anywhere — a rule that fails now goes unmentioned instead of loud.
  - **The job summary and the sticky PR comment are hardened against the analyzed project's own content.** Strings quoted from the repo under analysis — file paths, route ids, and rule messages embedding page content such as `<title>` text or JSON-LD values — can no longer forge report structure: an embedded newline, code fence, heading, `[text](url)` link or bare `<tag>` renders as inert quoted text. Visible on well-behaved projects in one place: a message containing a literal tag (`Missing <title>`) now renders as inline code, which also fixes table cells silently dropping such tags.
  - **More of the project is reachable, so findings move in both directions.** Head and heading resolution now follows a component imported through a `kit.alias`/`kit.files.lib` alias (`$components`, `$ui`, …) instead of only `$lib/…` and relative paths; every `application/ld+json` script on a route is analyzed instead of only the last one; and `seo/single-h1` counts headings rendered by imported local components. False "Missing" findings on routes whose content lives in such components disappear and Health can rise, while defects inside them — an empty `<title>`, invalid JSON-LD, a second `<h1>` — become visible for the first time.
  - **`seo/json-ld-validity` now checks `@type` against the schema.org vocabulary.** A bare type name that is not an exact, case-sensitive schema.org type produces a `warning`, with a did-you-mean hint for a casing slip or a typo within edit distance 2. IRI and prefixed forms are never flagged, and a document whose `@context` names a non-schema.org vocabulary is exempt.
  - **Several false positives removed.** `seo/json-ld-required-props` was stale against Google's current requirements — the `Article`/`BlogPosting`/`NewsArticle`, `Organization` and `Person` rows are gone, `Product` now accepts any one of `review`/`aggregateRating`/`offers`, `Recipe` needs only `name` + `image`, `VideoObject` drops `description`. `security/handler-state-write` and `security/shared-state-import` no longer fire on a universal `+page.ts`/`+layout.ts` that exports `ssr = false`; since the former is `critical`, that can turn a red run green. `performance/render-blocking-script` no longer flags non-executing script types (`text/partytown`, `importmap`, `speculationrules`). `correctness/effect-as-onmount` no longer flags an `$effect` reading reactive state through a member expression on an imported binding or a `new …()` local.

### Patch Changes

- e40f45c: Fix the `baseline` input reporting every finding as new on projects whose `svelte-vitals.config.*` imports `svelte-vitals` — the shape the `install` wizard scaffolds.

  The baseline ref is analyzed inside a temporary git worktree, and that worktree has no `node_modules` in its ancestry, so re-loading the config file from within it threw on the import. The comparison caught the error and fell back to reporting everything, which is the opposite of what the input is for: a gate meant to show only new findings showed all of them. The action now hands its own config-file load to the baseline analysis instead of letting it look for one.

  Both sides of the comparison therefore run under the same config, so editing `svelte-vitals.config.*` between the baseline ref and the current commit no longer makes findings look new on its own.

- f2f9314: Update the bundled analyzer to `svelte-vitals` 0.46.0 / `@svelte-vitals/core` 0.42.0. Nothing the action reports changes: no rule severity, score, finding, annotation, job summary or sticky-comment output moves. Upstream's visible work in this range is CLI-only (shell completion, spinner cursor restore, the `ci install` workflow scaffold, and the dispatch layer's exit code), and the rest is internal refactoring plus two new library exports the action does not use yet.
- 18d8dea: Surface the analyzer's non-fatal warnings as workflow annotations. `analyzeProject` reports config-file problems, version-floor notices, unparseable files it skipped, and rules that crashed and were dropped from the run — the action collected all of it and printed none of it.

  The crashed-rule case is why this matters now. A rule that throws no longer aborts the analysis; the run completes without it and its weight leaves the Health denominator, so nothing about the report looks wrong. Before, the exception propagated and failed the job outright. Without this, an incomplete scan passed the gate with no trace of which rule was missing.

  The gate is unchanged — these are annotations, not failures.

## 0.8.0

### Minor Changes

- 376842d: Update the bundled analyzer to `svelte-vitals` 0.44.0 / `@svelte-vitals/core` 0.38.0. The action's inputs and outputs are unchanged, and the step still fails on `failOn` severity rather than on any score. What changes is the numbers the report prints and what the scan finds:

  - **Category scores rise wherever a category checks few things.** Within one `(category, scope)` pair a `warning` now costs five times an `info` and a `critical` fifteen times, so a more severe finding always costs more there. Across pairs it does not: a key is never scored against less than 25 points of checks, so in a one-rule pair the three severities give 96, 80 and 40, where a lone `warning` used to score 0. Anything reading the Health number out of the job summary should be recalibrated — this moves in the opposite direction from the previous release.
  - **New findings in TypeScript-heavy projects.** Rune declarations behind a TS cast (`let count = $state(0) as number`) now feed the same facts as the uncast form, and imports inside `.svelte.ts` / `.svelte.js` runes modules are now collected — so `performance/heavy-import`, `performance/namespace-import`, `architecture/private-scope-import` and `architecture/route-component-import` see code they used to skip. These were silent false negatives, not new checks.
  - **The `diff` input no longer drops findings in non-ASCII paths.** Git octal-escapes such paths under its default `core.quotePath`, which never matched the raw UTF-8 location, so findings under e.g. a Japanese route directory vanished from a diff-scoped run. Changed-file detection now reads NUL-separated output.
  - New opt-in rule `architecture/reserved-name-placement` says which positions a reserved directory name may appear in, the inverse of `architecture/reserved-directory-names`. Off until its placement maps are configured, so it adds nothing to a scan until then.

- 613dbf8: Update the bundled analyzer to `svelte-vitals` 0.44.1 / `@svelte-vitals/core` 0.39.0. The action's inputs and outputs are unchanged, and the step still fails on `failOn` severity rather than on any score. What changes is what a scoped run reports and the scores beside it:

  - **A `diff`-scoped run's Health drops, and the old number was wrong.** Every rule's passing results now carry the same `location` a penalized result would, so changed-file filtering had to stop keeping a result merely because its `location` was in the changed set. Before this, a single incidental passing SEO check on a changed file could promote its whole category from absent to a fabricated 100 and pull Health upward. On the reference shape — one critical `correctness` finding plus one such SEO pass, both on changed files — Health moves from 89 to 79, and 79 is the correct number. If you read the Health value out of the job summary on `diff`-scoped runs, expect it lower and recalibrate against it. One pass of the same shape is deliberately kept: `architecture/unit-entry-file`'s route-less seed still survives `diff` scoping, so `architecture` keeps its own upward pull — that tradeoff predates this release and is unchanged by it.
  - **The `baseline` input no longer masks a genuine regression.** For `seo/title-presence` and the ten `headTagRule`-backed ids (`canonical-url`, `og-title`, `og-image`, `charset`, `viewport`, `twitter-card`, `description-presence`, `og-description`, `json-ld`, `og-url`), a route that passed at the baseline ref and then regressed — a deleted `<title>`, say — produced identical comparison keys on both sides and was dropped as "not new". Comparison is now penalized-findings-only, so those regressions are reported. Passing results no longer appear in baseline-scoped output at all.
  - **A `files:`-scoped `severity: 'off'` override now removes a rule's passing seed**, not just its penalized findings, which it always claimed to do. Scores move where such an override is configured — the upstream reproduction goes 98 → 96 once the stale seed is gone.
  - **A scoped run no longer warns that suppressions are stale just because the scope hid their findings.** With `svelte-vitals-suppressions.json` present, using the `diff` and `baseline` inputs together printed a misleading "N stale entries — re-run `--update-suppressions` to prune" annotation on every run. Staleness is now judged against the project-wide result set, so that annotation stops.
  - `architecture/prop-count`, on by default, now counts named props destructured alongside a rest element (`let { a, b, ...rest } = $props()`) instead of staying silent on the whole destructure. It can only surface findings on components that were previously invisible to it; the `max` default stays 6.
  - `architecture/reserved-directory-names` gains `anyCaseUnitScopes`, governing units whose name does not begin A–Z — the lowercase and `.ts`-entry units `unitScopes` could never reach. Defaults to `{}`, so a project that does not declare it sees no new findings.

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
