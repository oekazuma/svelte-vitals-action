# svelte-vitals-action

First-party GitHub Action for [svelte-vitals](https://github.com/oekazuma/svelte-vitals): static SvelteKit code-health checks (SEO, Performance, Correctness, Security, Architecture, Accessibility) on every pull request — inline annotations on the diff, a job summary, and a single sticky PR comment that updates in place on each push.

The easiest way to set it up is the generator (no YAML to hand-write, and it pins a working commit SHA for you):

```bash
npx svelte-vitals@latest ci install
```

Or by hand:

```yaml
name: svelte-vitals

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  svelte-vitals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          fetch-depth: 0 # full history, so diff/baseline can resolve the base ref
      - run: npm ci --ignore-scripts # so the action runs the project's own svelte-vitals
      - uses: oekazuma/svelte-vitals-action@<sha> # v<version>
        with:
          diff: origin/${{ github.base_ref }}
          baseline: origin/${{ github.base_ref }}
```

Pin `<sha>`/`<version>` from the latest [release tag](https://github.com/oekazuma/svelte-vitals-action/releases); `npx svelte-vitals ci upgrade` rewrites the pin in an existing workflow, and Renovate proposes updates automatically (this repo hosts only this one package, so its tags are plain `vX.Y.Z` — no extra Renovate config needed).

The install step applies to any workflow running the action, including one the generator wrote. It is shown with npm. If the project uses another package manager, install with that package manager instead, after the setup step it needs.

## Which svelte-vitals runs

The action looks for `node_modules/svelte-vitals` in the `path` directory and each parent directory up to the workspace root, and uses the first one it finds:

- **Installed, version 0.44.0 or later**: the action runs that installation's CLI, so CI analyzes and renders the report with the version in the project's lockfile, and its findings, report and pass/fail match a local `svelte-vitals` run. The scan runs twice: once with `--reporter md` for the job summary and the PR comment (its exit code decides whether the step fails), and once with `--reporter github` for the annotations.
- **Otherwise**: the action analyzes with the `svelte-vitals` bundled into it and says so in one message starting `svelte-vitals: analyzed with the bundled svelte-vitals <version>.`:

| Message                                                               | When                                                                                  | To clear it                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Warning: the installed version is older than 0.44.0                   | `node_modules/svelte-vitals` is older than 0.44.0, the oldest the action can run      | Update `svelte-vitals` in the project to 0.44.0 or later                          |
| Warning: the project declares `svelte-vitals` but it is not installed | `package.json` at `path` lists `svelte-vitals`, but no installation was found         | Install dependencies in a step before the action                                  |
| Notice: neither declared nor installed                                | `package.json` at `path` does not list `svelte-vitals`, and no installation was found | Add `svelte-vitals` as a devDependency and install dependencies before the action |

## Inputs

| Input          | Description                                                          | Default               |
| -------------- | -------------------------------------------------------------------- | --------------------- |
| `path`         | Project directory to analyze                                         | `.`                   |
| `diff`         | Scope findings to files changed vs this git ref (e.g. `origin/main`) | (unset)               |
| `baseline`     | Report only findings not already present at this git ref             | (unset)               |
| `github-token` | Token used to read/post/update the sticky PR comment                 | `${{ github.token }}` |

The job fails when the scan finds gating findings (per the resolved `failOn`, default `critical`) — after the summary/comment are written, so you always get the report. On fork PRs the sticky comment is skipped (GitHub downgrades the token); annotations and the job summary still work.

## Configuration — the inputs are not the whole story

Whichever `svelte-vitals` runs reads the project's committed files the way a local CLI run does, so everything you configure there applies here automatically, with no action input involved:

- **[`svelte-vitals.config.*`](https://oekazuma.github.io/svelte-vitals/guides/configuration/)** — disable rules, change their severity, or move a configurable rule's thresholds/lists (`rules`, either `'off' | Severity` or the object form `{ severity, options }`), scope rules/categories to specific routes or files (`overrides` — e.g. turn SEO rules off for auth-only routes: `overrides: [{ files: 'src/routes/(app)/**', rules: { seo: 'off' } }]`), `failOn`, `weights`, and the rest.
- **[`svelte-vitals-suppressions.json`](https://oekazuma.github.io/svelte-vitals/guides/cli/#svelte-vitals-suppressionsjson----update-suppressions----no-suppressions)** — a committed one-shot acceptance of the existing backlog (`svelte-vitals --update-suppressions`); the action applies it whenever it's present in the repo.

See [Excluding routes or rules](https://oekazuma.github.io/svelte-vitals/guides/ci/#excluding-routes-or-rules) in the CI guide for which mechanism fits which situation, and the [CI integration guide](https://oekazuma.github.io/svelte-vitals/guides/ci/) for the full workflow reference.
