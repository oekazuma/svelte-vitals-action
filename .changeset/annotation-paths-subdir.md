---
'@svelte-vitals/action': patch
---

Attach annotations to the right file when `path` is a subdirectory of the repository. The action rewrites each annotation's file to be relative to the repository root (`GITHUB_WORKSPACE`) instead of the analyzed project, both when it runs the project's installed `svelte-vitals` and when it uses the bundled one. A file in a sibling workspace package (`../ui/...` from the project) resolves to its repository path. When `path` is the repository root, annotations are printed as before.
