import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { resolve } from 'node:path';
import { STICKY_COMMENT_MARKER } from '../src/sticky-comment.js';
import { fallbackMessage } from '../src/fallback-message.js';
import type { CliResolution } from '../src/resolve-cli.js';
import type { CliRun } from '../src/run-cli.js';

// `fork.ts`/`sticky-comment.ts` are pure helpers already covered by their own test
// files — main() uses the real implementations here, and the real `cliArgs`. Mocked are
// the external SDK surface (@actions/core, @actions/github, svelte-vitals,
// @svelte-vitals/core) and this repository's subprocess seams, `resolveProjectCli` and
// `runCli`, which their own test files exercise against real directories and processes.
const h = vi.hoisted(() => {
  const inputs: Record<string, string> = {};

  const getInput = vi.fn((name: string) => inputs[name] ?? '');
  const info = vi.fn();
  const warning = vi.fn();
  const notice = vi.fn();
  const setFailed = vi.fn();
  const write = vi.fn(async () => {});
  const addRaw = vi.fn(() => ({ write }));

  const context: {
    eventName: string;
    repo: { owner: string; repo: string };
    payload: { pull_request?: Record<string, unknown> };
  } = {
    eventName: 'push',
    repo: { owner: 'oekazuma', repo: 'svelte-vitals' },
    payload: {}
  };

  const listComments = vi.fn(async () => ({ data: [] as { id: number; body: string | null }[] }));
  const updateComment = vi.fn<(params: Record<string, unknown>) => Promise<Record<string, unknown>>>(async () => ({}));
  const createComment = vi.fn<(params: Record<string, unknown>) => Promise<Record<string, unknown>>>(async () => ({}));
  const getOctokit = vi.fn(() => ({
    rest: {
      issues: { listComments, updateComment, createComment }
    }
  }));

  const analyzeProject = vi.fn(
    async (): Promise<{
      results: unknown[];
      config: { failOn: string };
      version: string;
      warnings: string[];
      loadedConfig?: unknown;
    }> => ({
      results: [],
      config: { failOn: 'critical' },
      version: '0.0.0-test',
      warnings: []
    })
  );
  const applyScope = vi.fn(async (results: unknown[], _opts: Record<string, unknown>) => results);

  const formatGithubReport = vi.fn(() => 'annotations');
  const formatMarkdownReport = vi.fn((..._args: unknown[]) => 'markdown report');
  const summarize = vi.fn(() => ({}));
  const hasFailureAtOrAbove = vi.fn(() => false);

  const resolveProjectCli = vi.fn<(projectDir: string, stopDir: string) => CliResolution>(() => ({ kind: 'missing' }));
  const runCli = vi.fn<(bin: string, args: string[], mode: 'capture' | 'inherit') => Promise<CliRun>>(async () => ({
    code: 0,
    stdout: '',
    stderr: ''
  }));

  return {
    inputs,
    getInput,
    info,
    warning,
    notice,
    setFailed,
    write,
    addRaw,
    context,
    listComments,
    updateComment,
    createComment,
    getOctokit,
    analyzeProject,
    applyScope,
    formatGithubReport,
    formatMarkdownReport,
    summarize,
    hasFailureAtOrAbove,
    resolveProjectCli,
    runCli
  };
});

vi.mock('@actions/core', () => ({
  getInput: h.getInput,
  info: h.info,
  warning: h.warning,
  notice: h.notice,
  setFailed: h.setFailed,
  summary: { addRaw: h.addRaw }
}));

vi.mock('@actions/github', () => ({
  context: h.context,
  getOctokit: h.getOctokit
}));

vi.mock('svelte-vitals', () => ({
  analyzeProject: h.analyzeProject,
  applyScope: h.applyScope
}));

vi.mock('@svelte-vitals/core', () => ({
  formatGithubReport: h.formatGithubReport,
  formatMarkdownReport: h.formatMarkdownReport,
  summarize: h.summarize,
  hasFailureAtOrAbove: h.hasFailureAtOrAbove
}));

vi.mock('../src/resolve-cli.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/resolve-cli.js')>()),
  resolveProjectCli: h.resolveProjectCli
}));

vi.mock('../src/run-cli.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/run-cli.js')>()),
  runCli: h.runCli
}));

// Importing this module runs its top-level `main().catch(...)` as a side effect (that
// call is the real action's entry point — see packages/action/src/index.ts — and must
// stay). `beforeAll` below drains that one extra invocation before any test's own
// `main()` call and assertions run.
import { main } from '../src/index.js';

function setPullRequest(payload: Record<string, unknown> | undefined): void {
  h.context.payload.pull_request = payload;
}

beforeAll(async () => {
  // Flush the microtask chain kicked off by the module's own top-level `main()` call
  // so it doesn't pollute the call counts asserted by the first real test.
  await new Promise((resolve) => setTimeout(resolve, 0));
});

beforeEach(() => {
  vi.stubEnv('GITHUB_TOKEN', '');

  for (const key of Object.keys(h.inputs)) delete h.inputs[key];
  h.context.eventName = 'push';
  h.context.repo = { owner: 'oekazuma', repo: 'svelte-vitals' };
  h.context.payload = {};

  h.listComments.mockResolvedValue({ data: [] });
  h.hasFailureAtOrAbove.mockReturnValue(false);
  h.resolveProjectCli.mockReturnValue({ kind: 'missing' });
  h.runCli.mockResolvedValue({ code: 0, stdout: '', stderr: '' });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('main()', () => {
  it('creates a new sticky comment on a same-repo PR with no existing report comment', async () => {
    h.inputs['github-token'] = 'gh-token';
    h.context.eventName = 'pull_request';
    setPullRequest({ number: 42, head: { repo: { full_name: 'oekazuma/svelte-vitals' } } });
    h.listComments.mockResolvedValue({ data: [] });

    await main();

    expect(h.createComment).toHaveBeenCalledTimes(1);
    expect(h.updateComment).not.toHaveBeenCalled();
    expect(h.createComment.mock.calls[0]![0]).toMatchObject({
      owner: 'oekazuma',
      repo: 'svelte-vitals',
      issue_number: 42,
      body: `${STICKY_COMMENT_MARKER}\nmarkdown report`
    });
  });

  it('updates the existing sticky comment on a same-repo PR', async () => {
    h.inputs['github-token'] = 'gh-token';
    h.context.eventName = 'pull_request';
    setPullRequest({ number: 7, head: { repo: { full_name: 'oekazuma/svelte-vitals' } } });
    h.listComments.mockResolvedValue({
      data: [{ id: 99, body: `${STICKY_COMMENT_MARKER}\nold report` }]
    });

    await main();

    expect(h.updateComment).toHaveBeenCalledTimes(1);
    expect(h.updateComment.mock.calls[0]![0]).toMatchObject({
      owner: 'oekazuma',
      repo: 'svelte-vitals',
      comment_id: 99,
      body: `${STICKY_COMMENT_MARKER}\nmarkdown report`
    });
    expect(h.createComment).not.toHaveBeenCalled();
  });

  it('skips the comment step entirely for a fork PR, but still emits annotations and the job summary', async () => {
    h.inputs['github-token'] = 'gh-token';
    h.context.eventName = 'pull_request';
    setPullRequest({ number: 3, head: { repo: { full_name: 'someone-else/svelte-vitals' } } });

    await main();

    expect(h.getOctokit).not.toHaveBeenCalled();
    expect(h.info).toHaveBeenCalledWith('annotations');
    expect(h.addRaw).toHaveBeenCalledWith('markdown report');
    expect(h.write).toHaveBeenCalledTimes(1);
  });

  it('skips the comment step entirely for a non-PR event (e.g. push)', async () => {
    h.inputs['github-token'] = 'gh-token';
    h.context.eventName = 'push';
    setPullRequest(undefined);

    await main();

    expect(h.getOctokit).not.toHaveBeenCalled();
    expect(h.createComment).not.toHaveBeenCalled();
    expect(h.updateComment).not.toHaveBeenCalled();
  });

  it('warns instead of failing the build when the octokit call throws', async () => {
    h.inputs['github-token'] = 'gh-token';
    h.context.eventName = 'pull_request';
    setPullRequest({ number: 5, head: { repo: { full_name: 'oekazuma/svelte-vitals' } } });
    h.listComments.mockRejectedValueOnce(new Error('boom: rate limited'));

    await expect(main()).resolves.toBeUndefined();

    expect(h.warning).toHaveBeenCalledTimes(1);
    expect(h.warning.mock.calls[0]![0]).toMatch(/failed to post\/update the PR comment/);
    expect(h.warning.mock.calls[0]![0]).toMatch(/boom: rate limited/);
    expect(h.setFailed).not.toHaveBeenCalled();
  });

  it("reuses this run's config-file load for the baseline worktree", async () => {
    const loadedConfig = { path: '/repo/svelte-vitals.config.ts', config: {} };
    h.analyzeProject.mockResolvedValueOnce({
      results: [],
      config: { failOn: 'critical' },
      version: '0.0.0-test',
      warnings: [],
      loadedConfig
    });

    await main();

    const { analyzeOpts } = h.applyScope.mock.calls[0]![1] as { analyzeOpts: Record<string, unknown> };
    expect(analyzeOpts).toEqual({ loadedConfig });
    // Anything beyond loadedConfig changes applyScope's behaviour: a `route` key alone
    // flips its route-scoping signal and with it how suppressions are applied.
    expect(Object.keys(analyzeOpts)).toEqual(['loadedConfig']);
  });

  it('tells the baseline worktree there is no config file rather than letting it look', async () => {
    // `undefined` would mean "load one from cwd" — i.e. from inside the worktree.
    await main();

    expect(h.applyScope.mock.calls[0]![1]).toMatchObject({ analyzeOpts: { loadedConfig: null } });
  });

  it("surfaces the analyzer's non-fatal warnings without failing the build", async () => {
    h.analyzeProject.mockResolvedValueOnce({
      results: [],
      config: { failOn: 'critical' },
      version: '0.0.0-test',
      warnings: ['rule seo/title-presence failed and was skipped: boom', 'skipped 1 unparseable file']
    });

    await main();

    expect(h.warning).toHaveBeenCalledTimes(2);
    expect(h.warning).toHaveBeenCalledWith('rule seo/title-presence failed and was skipped: boom');
    expect(h.warning).toHaveBeenCalledWith('skipped 1 unparseable file');
    expect(h.setFailed).not.toHaveBeenCalled();
  });

  it('fails the build when hasFailureAtOrAbove reports a blocking finding', async () => {
    h.hasFailureAtOrAbove.mockReturnValue(true);

    await main();

    expect(h.setFailed).toHaveBeenCalledTimes(1);
    expect(h.setFailed).toHaveBeenCalledWith('svelte-vitals found blocking issues (see annotations above).');
  });

  it('does not fail the build when hasFailureAtOrAbove reports no blocking finding', async () => {
    h.hasFailureAtOrAbove.mockReturnValue(false);

    await main();

    expect(h.setFailed).not.toHaveBeenCalled();
  });
});

const BIN = '/p/node_modules/svelte-vitals/dist/bin.js';
const REPORT = '<!-- svelte-vitals v0.50.0 -->\n# report';

describe('main() with svelte-vitals installed in the project', () => {
  beforeEach(() => {
    h.resolveProjectCli.mockReturnValue({ kind: 'installed', version: '0.50.0', bin: BIN });
    h.runCli.mockResolvedValueOnce({ code: 0, stdout: REPORT, stderr: '' });
  });

  it('runs the installed CLI twice and publishes its markdown', async () => {
    await main();

    expect(h.runCli.mock.calls).toEqual([
      [BIN, [resolve('.'), '--reporter', 'md'], 'capture'],
      [BIN, [resolve('.'), '--reporter', 'github'], 'capture']
    ]);
    expect(h.addRaw).toHaveBeenCalledWith(REPORT);
    expect(h.write).toHaveBeenCalledTimes(1);
    expect(h.analyzeProject).not.toHaveBeenCalled();
    expect(h.setFailed).not.toHaveBeenCalled();
  });

  it('passes path, diff and baseline through to both runs', async () => {
    h.inputs.path = 'apps/web';
    h.inputs.diff = 'origin/main';
    h.inputs.baseline = 'origin/main';

    await main();

    const rest = ['--diff', 'origin/main', '--baseline', 'origin/main'];
    expect(h.runCli.mock.calls).toEqual([
      [BIN, [resolve('apps/web'), '--reporter', 'md', ...rest], 'capture'],
      [BIN, [resolve('apps/web'), '--reporter', 'github', ...rest], 'capture']
    ]);
  });

  it('passes a path named like a CLI subcommand as an absolute path', async () => {
    h.inputs.path = 'docs';

    await main();

    expect(h.runCli.mock.calls.map(([, args]) => args[0])).toEqual([resolve('docs'), resolve('docs')]);
  });

  it('resolves from the path input up to the workspace', async () => {
    vi.stubEnv('GITHUB_WORKSPACE', '/ws');
    h.inputs.path = 'apps/web';

    await main();

    expect(h.resolveProjectCli).toHaveBeenCalledWith(resolve('apps/web'), '/ws');
  });

  it('posts the installed CLI markdown as the sticky comment', async () => {
    h.inputs['github-token'] = 'gh-token';
    h.context.eventName = 'pull_request';
    setPullRequest({ number: 42, head: { repo: { full_name: 'oekazuma/svelte-vitals' } } });

    await main();

    expect(h.createComment).toHaveBeenCalledTimes(1);
    expect(h.createComment.mock.calls[0]![0]).toMatchObject({ body: `${STICKY_COMMENT_MARKER}\n${REPORT}` });
  });

  it('fails after publishing when the CLI exits 1', async () => {
    h.runCli.mockReset();
    h.runCli.mockResolvedValueOnce({ code: 1, stdout: REPORT, stderr: '' });
    h.runCli.mockResolvedValueOnce({ code: 1, stdout: '', stderr: '' });

    await main();

    expect(h.addRaw).toHaveBeenCalledWith(REPORT);
    expect(h.setFailed).toHaveBeenCalledTimes(1);
    expect(h.setFailed).toHaveBeenCalledWith('svelte-vitals found blocking issues (see annotations above).');
    expect(h.write.mock.invocationCallOrder[0]!).toBeLessThan(h.setFailed.mock.invocationCallOrder[0]!);
  });

  it('fails with the CLI stderr and publishes nothing when it exits 2', async () => {
    h.runCli.mockReset();
    h.runCli.mockResolvedValueOnce({ code: 2, stdout: '', stderr: 'svelte-vitals: unknown rule id(s) in rules: x\n' });

    await main();

    expect(h.setFailed).toHaveBeenCalledTimes(1);
    expect(h.setFailed).toHaveBeenCalledWith('svelte-vitals: unknown rule id(s) in rules: x');
    expect(h.addRaw).not.toHaveBeenCalled();
    expect(h.runCli).toHaveBeenCalledTimes(1);
    expect(h.analyzeProject).not.toHaveBeenCalled();
  });

  it('fails with what happened when the CLI cannot start', async () => {
    h.runCli.mockReset();
    h.runCli.mockResolvedValueOnce({ code: null, stdout: '', stderr: '', failure: 'was killed by SIGKILL' });

    await main();

    expect(h.setFailed).toHaveBeenCalledTimes(1);
    expect(h.setFailed).toHaveBeenCalledWith(`svelte-vitals: ${BIN} was killed by SIGKILL.`);
    expect(h.addRaw).not.toHaveBeenCalled();
    expect(h.runCli).toHaveBeenCalledTimes(1);
    expect(h.analyzeProject).not.toHaveBeenCalled();
  });

  it('fails with the CLI stderr when it exits 1 without printing a report', async () => {
    h.runCli.mockReset();
    h.runCli.mockResolvedValueOnce({
      code: 1,
      stdout: '',
      stderr: "Error: Cannot find module '/p/node_modules/svelte-vitals/dist/bin.js'\n"
    });

    await main();

    expect(h.setFailed).toHaveBeenCalledTimes(1);
    expect(h.setFailed.mock.calls[0]![0]).toContain(BIN);
    expect(h.setFailed.mock.calls[0]![0]).toContain('Cannot find module');
    expect(h.addRaw).not.toHaveBeenCalled();
    expect(h.runCli).toHaveBeenCalledTimes(1);
    expect(h.analyzeProject).not.toHaveBeenCalled();
  });

  it('turns the first run stderr lines into warnings', async () => {
    h.runCli.mockReset();
    h.runCli.mockResolvedValueOnce({ code: 0, stdout: REPORT, stderr: 'svelte-vitals: a\n\nsvelte-vitals: b\n' });
    h.runCli.mockResolvedValueOnce({ code: 0, stdout: '', stderr: '' });

    await main();

    expect(h.warning).toHaveBeenCalledTimes(2);
    expect(h.warning).toHaveBeenCalledWith('svelte-vitals: a');
    expect(h.warning).toHaveBeenCalledWith('svelte-vitals: b');
  });

  it.each([
    [{ code: 2, stdout: '', stderr: '' }, 'exited with code 2'],
    [{ code: null, stdout: '', stderr: '', failure: 'was killed by SIGKILL' }, 'was killed by SIGKILL']
  ])('warns, without failing, when the second run cannot produce annotations', async (run2, how) => {
    h.runCli.mockResolvedValueOnce(run2);

    await main();

    expect(h.warning).toHaveBeenCalledTimes(1);
    expect(h.warning).toHaveBeenCalledWith(`svelte-vitals: the annotations could not be produced: ${BIN} ${how}.`);
    expect(h.addRaw).toHaveBeenCalledWith(REPORT);
    expect(h.setFailed).not.toHaveBeenCalled();
  });

  it('prints the second run annotations with file= relative to the workspace', async () => {
    vi.stubEnv('GITHUB_WORKSPACE', resolve('.'));
    h.inputs.path = 'apps/web';
    h.runCli.mockResolvedValueOnce({
      code: 1,
      stdout: '::error file=src/routes/+page.svelte,line=3,title=t::m\n::warning title=t::m\n',
      stderr: ''
    });

    await main();

    expect(h.info).toHaveBeenCalledWith(
      '::error file=apps/web/src/routes/+page.svelte,line=3,title=t::m\n::warning title=t::m'
    );
  });

  it('passes the second run stderr through to the log', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    h.runCli.mockResolvedValueOnce({ code: 0, stdout: '', stderr: 'svelte-vitals: a\n' });

    await main();

    expect(stderr).toHaveBeenCalledWith('svelte-vitals: a\n');
    stderr.mockRestore();
    expect(h.info).not.toHaveBeenCalled();
    expect(h.warning).not.toHaveBeenCalled();
  });

  it('ignores the second run exit code', async () => {
    h.runCli.mockResolvedValueOnce({ code: 1, stdout: '', stderr: '' });

    await main();

    expect(h.runCli).toHaveBeenCalledTimes(2);
    expect(h.setFailed).not.toHaveBeenCalled();
  });
});

describe('main() falling back to the bundled analyzer', () => {
  it('warns when the project declares svelte-vitals but has not installed it', async () => {
    const resolution = { kind: 'missing', declared: '^0.55.0' } as const;
    h.resolveProjectCli.mockReturnValue(resolution);

    await main();

    expect(h.warning).toHaveBeenCalledWith(fallbackMessage(resolution, __BUNDLED_SVELTE_VITALS_VERSION__).text);
    expect(h.addRaw).toHaveBeenCalledWith('markdown report');
    expect(h.runCli).not.toHaveBeenCalled();
  });

  it('warns when the installed version is too old', async () => {
    const resolution = { kind: 'too-old', version: '0.40.0' } as const;
    h.resolveProjectCli.mockReturnValue(resolution);

    await main();

    expect(h.warning).toHaveBeenCalledWith(fallbackMessage(resolution, __BUNDLED_SVELTE_VITALS_VERSION__).text);
    expect(h.addRaw).toHaveBeenCalledWith('markdown report');
    expect(h.runCli).not.toHaveBeenCalled();
  });

  it('notes, without warning, when svelte-vitals is neither declared nor installed', async () => {
    const text = fallbackMessage({ kind: 'missing' }, __BUNDLED_SVELTE_VITALS_VERSION__).text;

    await main();

    expect(h.notice).toHaveBeenCalledWith(text);
    expect(h.warning).not.toHaveBeenCalledWith(text);
    expect(h.runCli).not.toHaveBeenCalled();
  });

  it('warns before analyzing, so the message stands when the analysis throws', async () => {
    const resolution = { kind: 'missing', declared: '^0.55.0' } as const;
    h.resolveProjectCli.mockReturnValue(resolution);
    h.analyzeProject.mockRejectedValueOnce(new Error("Cannot find package 'svelte-vitals'"));

    await expect(main()).rejects.toThrow("Cannot find package 'svelte-vitals'");

    expect(h.warning).toHaveBeenCalledWith(fallbackMessage(resolution, __BUNDLED_SVELTE_VITALS_VERSION__).text);
    expect(h.warning.mock.invocationCallOrder[0]!).toBeLessThan(h.analyzeProject.mock.invocationCallOrder.at(-1)!);
  });

  it('prints the annotations with file= relative to the workspace', async () => {
    vi.stubEnv('GITHUB_WORKSPACE', resolve('.'));
    h.inputs.path = 'apps/web';
    h.formatGithubReport.mockReturnValueOnce('::error file=src/routes/+page.svelte,title=t::m');

    await main();

    expect(h.info).toHaveBeenCalledWith('::error file=apps/web/src/routes/+page.svelte,title=t::m');
  });

  it('names the bundled analyzer version in the report', async () => {
    await main();

    expect(h.formatMarkdownReport.mock.calls[0]![2]).toEqual({ version: __BUNDLED_SVELTE_VITALS_VERSION__ });
  });
});
