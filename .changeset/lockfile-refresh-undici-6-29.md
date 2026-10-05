---
'@svelte-vitals/action': patch
---

Refresh the lockfile. `svelte-vitals` and `@svelte-vitals/core` stay at 0.55.2, so no rule, severity, score or report output changes. The bundle consumers run is still rebuilt on newer transitive dependencies, which is why this ships as a release rather than passing unnoticed.

What moved inside it: the Octokit stack behind the sticky PR comment (`@octokit/core` 7.0.7 → 7.0.8, `request`, `request-error`, `endpoint`, `graphql`, and `types` 17 → 18), along with `undici` 6.28.0 → 6.29.0 and `content-type` 3.0.0 → 3.1.1. Underneath the analysis, it moved `@babel/parser` 7.29.8 → 7.29.9, `esrap` 2.3.6 → 2.4.0, `zimmerframe` and `source-map-js`.
