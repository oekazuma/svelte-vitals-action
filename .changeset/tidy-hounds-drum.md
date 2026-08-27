---
'@svelte-vitals/action': patch
---

Refresh the lockfile. `svelte-vitals` stays at 0.53.0 and `@svelte-vitals/core` at 0.49.0, so no rule, severity, score or report output changes — but the bundle consumers run is rebuilt on newer transitive dependencies, which is why this ships as a release rather than passing unnoticed.

What moved inside it: the Octokit stack behind the sticky PR comment (`@octokit/core`, `request`, `request-error`, `endpoint`, `graphql`, both plugins) along with `undici` 6.27.0 → 6.28.0 and `content-type`; and, underneath the analysis, `acorn` 8.17.0 → 8.18.0 with `@sveltejs/acorn-typescript` 1.0.11 → 1.0.13, `esrap`, and the `picomatch`/`fdir` pair the file walk and glob matching use.
