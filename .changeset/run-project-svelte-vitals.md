---
'@svelte-vitals/action': minor
---

Run the `svelte-vitals` installed in the analyzed project instead of the bundled one. The action looks for `node_modules/svelte-vitals` from `path` up to the workspace root; when it finds version 0.44.0 or later, it runs that installation's CLI, so the findings, the job summary, the PR comment and whether the step fails match a local run with the version in the project's lockfile. The action's inputs are unchanged and it still has no outputs.

- **A workflow that installs dependencies before this step can report differently after this update**, because the scan now uses the project's `svelte-vitals` rather than the bundled 0.55.5. If the project pins an older version, findings and the gate follow that version.
- **On that path the scan runs twice**: once with `--reporter md` for the summary and comment (its exit code decides whether the step fails) and once with `--reporter github` for the annotations, so the step takes longer.
- **Without a usable installation the action analyzes with the bundled `svelte-vitals` as before**, and says so: a warning when the installed version is older than 0.44.0, a warning when the project's `package.json` declares `svelte-vitals` but it is not installed, and a notice when it is neither declared nor installed.

To analyze with the project's own version, add an install step (for example `npm ci --ignore-scripts`, or the project's own package manager) before the action step.
