# @svelte-vitals/action

## 0.4.1

### Patch Changes

- 18bbb18: Added `branding` (icon/color) to `action.yml` — required by GitHub before the action can be published to the GitHub Marketplace.

## 0.4.0

### Minor Changes

- Migrated out of the [svelte-vitals](https://github.com/oekazuma/svelte-vitals) monorepo into this dedicated repository, following the same pattern as `changesets/action`, `pnpm/action-setup`, and `renovatebot/github-action`. This repo's `svelte-vitals`/`@svelte-vitals/core` dependencies are now regular npm-registry semver ranges (not workspace-linked), and its git tags are plain `vX.Y.Z` — Renovate's built-in `github-actions` manager now works out of the box for consumers, with no custom configuration needed. Continues the version series from the old `@svelte-vitals/action@0.3.8`.

  **Breaking:** the action reference changes from `oekazuma/svelte-vitals/packages/action@<sha>` to `oekazuma/svelte-vitals-action@<sha>`. Re-run `npx svelte-vitals@latest ci install --force` (or `ci upgrade`) to update an existing workflow.
