import { afterEach, describe, it, expect, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cliArgs, runCli } from '../src/run-cli.js';

const fakeCli = fileURLToPath(new URL('./fixtures/fake-cli.mjs', import.meta.url));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('cliArgs', () => {
  it('builds the argument list', () => {
    expect(cliArgs('md', { path: 'apps/web' })).toEqual(['apps/web', '--reporter', 'md']);
    expect(cliArgs('github', { path: '.', diff: 'origin/main', baseline: 'origin/main' })).toEqual([
      '.',
      '--reporter',
      'github',
      '--diff',
      'origin/main',
      '--baseline',
      'origin/main'
    ]);
  });
});

describe('runCli', () => {
  it('passes the arguments to the bin', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'run-cli-'));
    try {
      const argsFile = join(dir, 'args.json');
      vi.stubEnv('FAKE_ARGS_FILE', argsFile);
      const args = cliArgs('github', { path: 'apps/web', diff: 'origin/main' });
      const run = await runCli(fakeCli, args, 'capture');
      expect(run.code).toBe(0);
      expect(JSON.parse(readFileSync(argsFile, 'utf8'))).toEqual(args);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('captures stdout, stderr and exit code 0', async () => {
    vi.stubEnv('FAKE_STDOUT', '# report');
    vi.stubEnv('FAKE_STDERR', 'svelte-vitals: note');
    expect(await runCli(fakeCli, [], 'capture')).toEqual({
      code: 0,
      stdout: '# report',
      stderr: 'svelte-vitals: note'
    });
  });

  it.each([1, 2])('reports exit code %i', async (code) => {
    vi.stubEnv('FAKE_EXIT', String(code));
    const run = await runCli(fakeCli, [], 'capture');
    expect(run.code).toBe(code);
    expect(run.failure).toBeUndefined();
  });

  it('captures a report larger than the pipe buffer', async () => {
    vi.stubEnv('FAKE_STDOUT_BYTES', '5000000');
    const run = await runCli(fakeCli, [], 'capture');
    expect(run.code).toBe(0);
    expect(run.stdout.length).toBe(5_000_000);
  });

  it('reports a bin that cannot start', async () => {
    const run = await runCli('/nonexistent/bin.js', [], 'capture');
    expect(typeof run.code).toBe('number');
    expect(run.code).not.toBe(0);
    expect(run.stderr).toContain('/nonexistent/bin.js');
  });

  it('returns empty strings in inherit mode', async () => {
    expect(await runCli(fakeCli, [], 'inherit')).toEqual({ code: 0, stdout: '', stderr: '' });
  });
});
