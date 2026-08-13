---
'@svelte-vitals/action': patch
---

Fix the `baseline` input reporting every finding as new on projects whose `svelte-vitals.config.*` imports `svelte-vitals` — the shape the `install` wizard scaffolds.

The baseline ref is analyzed inside a temporary git worktree, and that worktree has no `node_modules` in its ancestry, so re-loading the config file from within it threw on the import. The comparison caught the error and fell back to reporting everything, which is the opposite of what the input is for: a gate meant to show only new findings showed all of them. The action now hands its own config-file load to the baseline analysis instead of letting it look for one.

Both sides of the comparison therefore run under the same config, so editing `svelte-vitals.config.*` between the baseline ref and the current commit no longer makes findings look new on its own.
