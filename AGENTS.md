# AGENTS.md

Repository conventions for AI agent sessions.

## What this is

The first-party GitHub Action for [svelte-vitals](https://github.com/oekazuma/svelte-vitals) — a
static SvelteKit code-health checker. This repo is not part of that monorepo; it's a standalone,
single-package repository (like `changesets/action`, `pnpm/action-setup`,
`renovatebot/github-action`) that depends on the published `svelte-vitals`/`@svelte-vitals/core`
npm packages as regular semver ranges, not workspace links.

## Verify commands

```bash
pnpm install
pnpm build      # tsup — bundles everything into dist/index.js (GitHub Actions runs it standalone, no npm install step)
pnpm test       # vitest
pnpm typecheck  # tsc --noEmit
pnpm lint       # oxlint + oxfmt --check
```

Run these yourself and confirm they pass before claiming a task is complete. CI also verifies
`dist/` is up to date (rebuild and re-commit if a source change leaves it stale).

## Hard rules

- **Dependency updates are deliberate, not automatic**: bumping `svelte-vitals`/`@svelte-vitals/core`
  here (via Renovate or by hand) doesn't happen just because the main monorepo changes — it's a
  reviewed update in this repo, on its own schedule.
- **`dist/index.js` is committed** — GitHub Actions runs it directly at the pinned ref, so there's
  no `npm install` step for consumers. Never gitignore it.
- **Changesets required** for any user-facing change (`pnpm changeset`). Merging to `main` opens/
  updates a "Version Packages" PR; merging that PR is what actually cuts a release — see the tag/
  release step in `.github/workflows/release.yml` for the mechanics.
- **Renovate automerge**: everything except `svelte-vitals`/`@svelte-vitals/core` bumps and major
  updates auto-merges once CI passes (see `renovate.json`'s `packageRules` and the branch's two
  rulesets — one lets Renovate bypass the review requirement, a separate one enforces the `ci`
  status check with no bypass for Renovate). A `svelte-vitals`/`@svelte-vitals/core` bump needs a
  manually-added changeset before merging, or the version never actually gets released.
