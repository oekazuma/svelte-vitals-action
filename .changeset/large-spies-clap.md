---
'@svelte-vitals/action': minor
---

Update the bundled analyzer to `svelte-vitals` 0.48.0 / `@svelte-vitals/core` 0.44.0. The action's inputs and outputs are unchanged, but two things here can stop a workflow that currently passes, and one of them needs a file renamed.

**Config files must be ESM, and `svelte-vitals.config.mjs` is no longer read.** The loader searches `svelte-vitals.config.{js,ts}` only. A leftover `.mjs` throws with a rename hint, and a `.js` config that parses as CommonJS throws with a "config files are ESM" error — both propagate out of the analysis and fail the step outright, rather than quietly falling back to defaults. Rename a `.mjs` config to `.js` (the project must be `"type": "module"`, which is SvelteKit's default) or to `.ts`. CommonJS projects are no longer supported.

**A new Accessibility category adds 15 rules, all on by default, and shifts every Health score.** ARIA role, attribute and value validity, required ARIA props, interactive-element nesting, accessible-name computability, label/control association, list-like text, `<select>` placeholder options, machine-readable `<time>`, an `app.html` doctype check, plus landmark duplication/nesting and project-wide id/idref integrity resolved across component boundaries. Existing projects will see new findings. Separately from any finding, a sixth category now enters the weighted average, so the Health number in the job summary and the sticky comment moves on upgrade with no change on your side — recalibrate anything reading it.

The analyzer also raises its minimum Node to 24.16.0. The action runs on `node24`, so this is only a concern if your runner's Node 24 predates that patch.

Beyond that, the scan reaches code it previously could not:

- **Projects styling components in a CSS dialect were not analyzable at all.** Svelte parses a `<style>` body as CSS whatever its `lang` says, so one `<style lang="scss">` block made a component unparseable, and a single unparseable route failed the entire run — which for this action meant the step failed with no report. SCSS, Less and Stylus projects now analyze normally, and will see their first real report.
- **Large projects were silently losing files.** Every `.svelte` file was read in parallel with no bound, so a big tree exhausted file descriptors and each `EMFILE` was recorded as a parse failure and dropped. Reads are now bounded, so files that were being skipped are analyzed and can carry findings.
- **Source mode no longer collapses `<link>` and `<script src>` tags that share a `rel` or `src`.** The composed `<svelte:head>` kept only the last one per key across the layout chain, so a page with two `rel="preload"` entries, both Google Fonts `preconnect` origins, or several `hreflang` alternates was judged on one of them — producing a false "un-preconnected origin" on a correctly configured site — and a page's `defer` copy of a script masked the layout's render-blocking one. Findings move in both directions here, and stored baselines or suppressions may need re-recording.
- `<link>` `rel` and `as` keywords are now matched case-insensitively as the HTML spec requires, so `rel="Canonical"` and `rel="Preload"` are recognised.
- The inline `svelte-vitals-disable-next-line` directive now honours `a11y/*` rule ids, which it silently ignored.
