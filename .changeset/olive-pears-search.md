---
'@svelte-vitals/action': minor
---

Update the bundled analyzer to `svelte-vitals` 0.44.0 / `@svelte-vitals/core` 0.38.0. The action's inputs and outputs are unchanged, and the step still fails on `failOn` severity rather than on any score. What changes is the numbers the report prints and what the scan finds:

- **Category scores rise wherever a category checks few things.** Within one `(category, scope)` pair a `warning` now costs five times an `info` and a `critical` fifteen times, so a more severe finding always costs more there. Across pairs it does not: a key is never scored against less than 25 points of checks, so in a one-rule pair the three severities give 96, 80 and 40, where a lone `warning` used to score 0. Anything reading the Health number out of the job summary should be recalibrated — this moves in the opposite direction from the previous release.
- **New findings in TypeScript-heavy projects.** Rune declarations behind a TS cast (`let count = $state(0) as number`) now feed the same facts as the uncast form, and imports inside `.svelte.ts` / `.svelte.js` runes modules are now collected — so `performance/heavy-import`, `performance/namespace-import`, `architecture/private-scope-import` and `architecture/route-component-import` see code they used to skip. These were silent false negatives, not new checks.
- **The `diff` input no longer drops findings in non-ASCII paths.** Git octal-escapes such paths under its default `core.quotePath`, which never matched the raw UTF-8 location, so findings under e.g. a Japanese route directory vanished from a diff-scoped run. Changed-file detection now reads NUL-separated output.
- New opt-in rule `architecture/reserved-name-placement` says which positions a reserved directory name may appear in, the inverse of `architecture/reserved-directory-names`. Off until its placement maps are configured, so it adds nothing to a scan until then.
