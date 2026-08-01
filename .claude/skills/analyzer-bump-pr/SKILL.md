---
name: analyzer-bump-pr
description: >-
  Take a Renovate PR that bumps `svelte-vitals` / `@svelte-vitals/core` from red CI to
  merge-ready in this repo — rebuild the committed `dist/`, write the changeset the
  release requires, verify, and push. Use this whenever a dependency-update PR here is
  mentioned at all: "この Renovate PR 対応して", "PR #N の CI が落ちてる", "アナライザ更新の
  changeset 書いて", "dist が stale って言われてる", or a bare PR link. Also use it when
  bumping those two packages by hand. Reach for it even when the ask sounds like a
  one-line fix ("just rebuild dist") — the rebuild alone leaves the release silently
  broken, and this skill covers the rest. Step 1 tells you how to bow out if the PR
  turns out to bump something else, so a wrong guess costs one command.
---

# Analyzer bump PRs

Renovate opens a PR bumping `svelte-vitals` / `@svelte-vitals/core`. It arrives with red
CI and it will sit there: `renovate.json` deliberately excludes these two packages from
automerge, because a human has to add something Renovate can't. Two repo-specific facts
are behind that:

- **`dist/index.js` is committed and Renovate never rebuilds it.** Consumers run the
  action straight from a pinned ref with no install step, so a `dist/` that doesn't match
  the lockfile ships stale analyzer behavior. CI's _Verify dist is up to date_ step
  catches it — that's the failure you'll see.
- **A changeset is required and Renovate never writes one.** No changeset means no version
  bump, no tag, no release. The dependency lands on `main` and nothing reaches users. See
  the hard rules in [AGENTS.md](../../../AGENTS.md).

So the fix is always the same two artifacts: a rebuilt `dist/` and a changeset. The
judgment is in the changeset.

## Workflow

**1. Read the PR.** `gh pr view <N> --json title,body,files,statusCheckRollup`. Keep the
release notes in the PR body — that's your changeset source material. Read the CI failure
rather than assuming it's the dist check; an analyzer bump can also break the build for
real (see step 3).

First confirm `svelte-vitals` / `@svelte-vitals/core` are actually among the bumped
packages. **If they aren't, stop here** — this skill doesn't cover the PR. Say which
packages it bumps and hand it back. The rest of these steps would be actively wrong there:
a lockfile refresh or a devDependency bump isn't user-facing, so writing a changeset for it
would cut a release that ships nothing, and those PRs are on Renovate's automerge list
precisely because they're meant to go through without this ceremony.

**2. Check out the branch and install.** Let `gh` resolve the branch — `renovate.json`
groups these bumps under `dependencies` today, so the head branch is
`renovate/dependencies`, but that follows the grouping config and isn't worth hardcoding.

```bash
gh pr checkout <N>
pnpm install --frozen-lockfile
```

**3. Run the full verify set before building.** `pnpm lint`, `pnpm typecheck`, `pnpm test`.
These are not a formality here: `src/` imports analysis and formatting functions from both
packages by name, so an export the bump renamed or removed surfaces as a typecheck failure.
If that happens you have a real source change to make, not just a rebuild — and the
changeset should say what changed for users as a result.

**4. Rebuild dist.**

```bash
pnpm build
git status --porcelain -- dist
```

`dist/index.js` should be modified. Sanity-check that the bump actually landed in the
bundle — grep for a rule id or symbol the release notes introduced. If `dist/` comes back
clean, the bump didn't touch anything the action bundles; say so, and reconsider whether
the change is user-facing enough to need a changeset at all.

**5. Write the changeset.** See below — this is the part that needs thought.

**6. Commit everything the bump required, together, and push to the Renovate branch.** One
commit: a rebuilt `dist/` without its changeset is exactly the half-done state this skill
exists to prevent, and if step 3 sent you into `src/`, that fix has to travel with the
bundle built from it — otherwise the pushed commit contains a `dist/` compiled from source
that isn't in the repo. Check `git status` against what you actually touched rather than
staging from memory.

```bash
git status --short          # dist/index.js, .changeset/<name>.md, and any src/ fix
git add -A
git commit -m "chore: rebuild dist and add changeset for analyzer update"
git push
```

**7. Wait for CI to go green, then hand off.** Don't claim it's fixed off the local run —
watch the checks and report the actual result. Then tell the user the release steps below.
Merging is theirs, not yours.

## Writing the changeset

The release notes in the PR body describe the **CLI and the core library**. The action is
neither: it imports the analysis functions and renders their output. Most of what a CLI
release announces never reaches an action user, so copying the notes across produces a
changelog that's mostly noise.

Include what changes the action's behavior or its report:

- New rules that are **on by default** — existing repos will see new findings.
- Changes to how scores are computed or displayed — anyone gating on the Health number
  feels these.
- Rules removed, renamed, or recalibrated.
- Config handling that becomes stricter, since the action's step fails on a fatal config
  error.
- False-positive fixes and resolution changes, which move findings in both directions.
- New opt-in rules — worth one line, flagged as inert until configured.

Leave out anything that only exists at the CLI surface: new subcommands (`docs`, `explain`),
`install` / client-target changes, `--help` and `--version` output, MCP server changes,
internal performance work with no visible effect. An action user never invokes those.

**Bump level:** `minor` for new default-on rules, recalibrated thresholds, or changed
score semantics. `patch` for pure false-positive fixes and no-visible-change updates.

`major` means a consumer's workflow breaks or has to change. Two surfaces can do that, and
only one of them is declared: the `inputs` in `action.yml` (there is no `outputs:` block —
the action doesn't set any), and the report itself — the annotations, the job summary, and
the sticky PR comment named in the action's description. The undeclared half is the one to
watch, since a bump can restructure the report without touching a line of this repo. A
version bump on its own is never major.

Write it for someone who runs the action in CI and wants to know whether their build is
about to behave differently. Lead with what moves, not with version numbers. `0.5.0` in
[CHANGELOG.md](../../../CHANGELOG.md) is the shape to match: it opens by naming the
versions in one clause, states that inputs and outputs are unchanged, then lists what the
scan now reports.

```markdown
---
'@svelte-vitals/action': minor
---

Update the bundled analyzer to `svelte-vitals` X.Y.Z / `@svelte-vitals/core` A.B.C. The
action's inputs and outputs are unchanged — what changes is what the scan reports:

- ...
```

## Handing off the release

You don't merge and you don't tag. Tell the user:

1. Merge the dependency PR.
2. The push to `main` runs `.github/workflows/release.yml`, which opens or updates a
   **Version Packages** PR with the version bump and generated changelog.
3. Merging _that_ PR is what cuts the `vX.Y.Z` tag and the GitHub release.

Two things worth warning about when they apply:

- If Renovate rebases the branch, your commit is gone and CI goes red again. Say so, and
  tell them not to tick the rebase checkbox in the PR body.
- The Version Packages PR bumps `package.json`, appends to `CHANGELOG.md`, and deletes the
  changeset it consumed — that deletion is expected, not a mistake. None of it reaches
  `dist/`: the action's version isn't embedded in the bundle, so that PR won't fail the
  freshness check. If it somehow does, the same rebuild applies.
