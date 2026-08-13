import * as core from '@actions/core';
import * as github from '@actions/github';
import { analyzeProject, applyScope } from 'svelte-vitals';
import { formatGithubReport, formatMarkdownReport, summarize, hasFailureAtOrAbove } from '@svelte-vitals/core';
import { isForkPR } from './fork.js';
import { planStickyComment, STICKY_COMMENT_MARKER } from './sticky-comment.js';

export async function main(): Promise<void> {
  const path = core.getInput('path') || '.';
  const diff = core.getInput('diff') || undefined;
  const baseline = core.getInput('baseline') || undefined;
  const token = core.getInput('github-token') || process.env.GITHUB_TOKEN || '';

  const analysis = await analyzeProject({ cwd: path });
  const { config, version, warnings, loadedConfig } = analysis;
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
  if (annotations) core.info(annotations);

  const markdown = formatMarkdownReport(results, config, { version });
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
      // the same reason) — only the gate below may call core.setFailed.
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

  const summary = summarize(results, config);
  if (hasFailureAtOrAbove(summary, config.failOn)) {
    core.setFailed('svelte-vitals found blocking issues (see annotations above).');
  }
}

main().catch((err) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
