---
'@svelte-vitals/action': minor
---

The action is retired and gets no further updates. Every run now starts with a warning saying so, with the command that replaces it: `npx svelte-vitals@latest ci install --force` writes a workflow that runs the `svelte-vitals` installed in the project, with annotations and a job summary but no PR comment. When the project's own `svelte-vitals` is 0.57.0 or later, it prints the same line, and the action still shows a single warning. See [Migrating from the action](https://oekazuma.github.io/svelte-vitals/guides/ci/#migrating-from-the-action).
