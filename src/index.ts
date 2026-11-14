import { resolve } from 'node:path';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { analyzeProject, applyScope } from 'svelte-vitals';
import { formatGithubReport, formatMarkdownReport, summarize, hasFailureAtOrAbove } from '@svelte-vitals/core';
import { isForkPR } from './fork.js';
import { planStickyComment, STICKY_COMMENT_MARKER } from './sticky-comment.js';
import { fallbackMessage } from './fallback-message.js';
import { repoRelativeAnnotations } from './annotation-paths.js';
import { resolveProjectCli, type CliResolution } from './resolve-cli.js';
import { cliArgs, runCli, type CliOptions } from './run-cli.js';

const BLOCKING_MESSAGE = 'svelte-vitals found blocking issues (see annotations above).';

export async function main(): Promise<void> {
  const path = core.getInput('path') || '.';
  const diff = core.getInput('diff') || undefined;
  const baseline = core.getInput('baseline') || undefined;
  const token = core.getInput('github-token') || process.env.GITHUB_TOKEN || '';

  const projectDir = resolve(path);
  const workspace = process.env.GITHUB_WORKSPACE ?? projectDir;
  const resolution = resolveProjectCli(projectDir, workspace);
  const toRepo = (annotations: string) => repoRelativeAnnotations(annotations, projectDir, workspace);
  if (resolution.kind === 'installed') {
    // The CLI reads a first argument such as `docs` or `install` as a subcommand, not a path.
    await runInstalledCli(resolution.bin, { path: projectDir, diff, baseline }, token, toRepo);
  } else {
    await runBundled(resolution, { path, diff, baseline }, token, toRepo);
  }
}

async function runInstalledCli(
  bin: string,
  opts: CliOptions,
  token: string,
  toRepo: (annotations: string) => string
): Promise<void> {
  const run = await runCli(bin, cliArgs('md', opts), 'capture');
  const stderr = run.stderr.trim();
  if (run.failure === undefined && run.code === 2) {
    core.setFailed(stderr || 'svelte-vitals exited with code 2.');
    return;
  }
  // The md reporter always prints a report, so an empty one means the bin never ran —
  // `node /missing/bin.js` exits 1, which would otherwise read as the gate firing.
  if (run.failure !== undefined || (run.code !== 0 && run.code !== 1) || run.stdout.trim() === '') {
    const how =
      run.failure ??
      (run.code === 0 || run.code === 1
        ? `exited with code ${run.code} without printing a report`
        : `exited with code ${run.code}`);
    core.setFailed(`svelte-vitals: ${bin} ${how}${stderr ? `:\n${stderr}` : '.'}`);
    return;
  }

  for (const line of run.stderr.split('\n')) if (line.trim()) core.warning(line);
  // Its exit code does not affect the gate: run 1 already decided it, this run only emits annotations.
  const annotations = await runCli(bin, cliArgs('github', opts), 'capture');
  // Raw, not as warnings: run 1 has already turned the same analysis's stderr into warnings.
  if (annotations.stderr) process.stderr.write(annotations.stderr);
  const lines = toRepo(annotations.stdout).trimEnd();
  if (lines) core.info(lines);
  if (annotations.failure !== undefined || annotations.code === 2) {
    const how = annotations.failure ?? 'exited with code 2';
    core.warning(`svelte-vitals: the annotations could not be produced: ${bin} ${how}.`);
  }

  await publish(run.stdout, token);
  if (run.code === 1) core.setFailed(BLOCKING_MESSAGE);
}

async function runBundled(
  resolution: Exclude<CliResolution, { kind: 'installed' }>,
  { path, diff, baseline }: CliOptions,
  token: string,
  toRepo: (annotations: string) => string
): Promise<void> {
  // Before analyzing: a config the bundled analyzer cannot load throws, and that user needs this most.
  const message = fallbackMessage(resolution, __BUNDLED_SVELTE_VITALS_VERSION__);
  core[message.level](message.text);
  const analysis = await analyzeProject({ cwd: path });
  const { config, warnings, loadedConfig } = analysis;
  // Includes rules that crashed and were dropped from the run, so the scan can be
  // incomplete while the gate below still passes — these must not stay silent.
  for (const line of warnings) core.warning(line);

  const results = await applyScope(analysis.results, {
    cwd: path,
    config,
    diffBase: diff,
    baseline,
    // The baseline ref is analyzed in a temp worktree with no node_modules in its
    // ancestry, so re-loading svelte-vitals.config.* there throws whenever that config
    // imports svelte-vitals — and the fallback is to report every finding as new. `null`
    // means "this project has no config file", not "go looking for one".
    analyzeOpts: { loadedConfig: loadedConfig ?? null },
    errorLog: (line) => core.warning(line)
  });

  const annotations = formatGithubReport(results, config);
  if (annotations) core.info(toRepo(annotations));

  await publish(formatMarkdownReport(results, config, { version: __BUNDLED_SVELTE_VITALS_VERSION__ }), token);

  const summary = summarize(results, config);
  if (hasFailureAtOrAbove(summary, config.failOn)) {
    core.setFailed(BLOCKING_MESSAGE);
  }
}

async function publish(markdown: string, token: string): Promise<void> {
  await core.summary.addRaw(markdown).write();

  const ctx = github.context;
  const pr = ctx.payload.pull_request;
  if (pr && token) {
    const headFullName = (pr as { head?: { repo?: { full_name?: string } } }).head?.repo?.full_name;
    const fork = isForkPR({
      eventName: ctx.eventName,
      repoFullName: `${ctx.repo.owner}/${ctx.repo.repo}`,
      headRepoFullName: headFullName
    });
    if (!fork) {
      // A transient GitHub API/permission failure here must not fail an otherwise-clean
      // scan (the old inline template's comment step carried continue-on-error: true for
      // the same reason) — only the gate may call core.setFailed.
      try {
        const octokit = github.getOctokit(token);
        const body = `${STICKY_COMMENT_MARKER}\n${markdown}`;
        const { data: comments } = await octokit.rest.issues.listComments({
          owner: ctx.repo.owner,
          repo: ctx.repo.repo,
          issue_number: pr.number,
          per_page: 100
        });
        const plan = planStickyComment(comments.map((c) => ({ id: c.id, body: c.body })));
        if (plan.op === 'update') {
          await octokit.rest.issues.updateComment({
            owner: ctx.repo.owner,
            repo: ctx.repo.repo,
            comment_id: plan.id,
            body
          });
        } else {
          await octokit.rest.issues.createComment({
            owner: ctx.repo.owner,
            repo: ctx.repo.repo,
            issue_number: pr.number,
            body
          });
        }
      } catch (err) {
        core.warning(
          `svelte-vitals: failed to post/update the PR comment: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }
}

main().catch((err) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
