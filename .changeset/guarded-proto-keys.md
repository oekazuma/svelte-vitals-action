---
'@svelte-vitals/action': patch
---

Update the bundled analyzer to `svelte-vitals` 0.54.5 / `@svelte-vitals/core` 0.54.5 — the two packages now share one version number. The action's inputs and outputs are unchanged, no rule is added, removed or recalibrated, and scoring semantics are the same. What changes is three crash and validation fixes for names that collide with `Object.prototype` keys (`constructor`, `toString`, `__proto__`):

- **`seo/json-ld-required-props` no longer crashes on a JSON-LD `@type` named like one of those keys.** The crash used to drop the rule from scoring project-wide with only a workflow warning, which quietly raised Health. Affected projects are now scored on the rule again, so they can see new JSON-LD findings and a lower Health number.
- **A rule option keyed by such a name is rejected as `unknown option`.** It was previously accepted silently or reported with the wrong message. Config errors are fatal for the action, so a `svelte-vitals.config` carrying one now fails the step at startup instead of running with the option ignored.
- **`architecture/reserved-name-placement` no longer throws** when a directory named like that is declared in only one of its placement maps. The rule only fires on projects that configure placements, so most workflows won't notice.

Everything else in these releases — SARIF path encoding, the `agent` reporter preamble, config hot-reload in `vite dev`, terminal sanitizing in the interactive prompts — lives at the CLI surface and never reaches the action.
