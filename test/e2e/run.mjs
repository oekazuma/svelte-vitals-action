import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const installedVersion = '0.44.0';
const bundledVersion = JSON.parse(readFileSync(join(root, 'node_modules/svelte-vitals/package.json'), 'utf8')).version;

function fail(message) {
  console.error(`e2e: ${message}`);
  process.exit(1);
}

if (!existsSync(join(root, 'test/e2e/workspace/node_modules/svelte-vitals/package.json'))) {
  fail("the fixture is not installed: run 'npm ci --ignore-scripts' in test/e2e/workspace");
}

function runAction(path, workspace) {
  const summaryFile = join(mkdtempSync(join(tmpdir(), 'svelte-vitals-action-e2e-')), 'summary.md');
  writeFileSync(summaryFile, '');

  // Inherited runner variables (a token, the real event payload) would make local and CI runs differ.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GITHUB_') && !key.startsWith('INPUT_'))
  );
  Object.assign(env, {
    INPUT_PATH: path,
    GITHUB_WORKSPACE: workspace,
    GITHUB_STEP_SUMMARY: summaryFile,
    GITHUB_EVENT_NAME: 'push',
    GITHUB_REPOSITORY: 'oekazuma/svelte-vitals-action'
  });

  const child = spawnSync(process.execPath, ['dist/index.js'], { cwd: root, env, encoding: 'utf8' });
  if (child.status !== 0 && child.status !== 1) {
    fail(`the action exited with ${child.status ?? child.signal}\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`);
  }
  return {
    stdout: child.stdout,
    summary: readFileSync(summaryFile, 'utf8'),
    status: child.status,
    output: `stdout:\n${child.stdout}\nstderr:\n${child.stderr}`
  };
}

// The fixture sits in a subdirectory of GITHUB_WORKSPACE, which is where GitHub resolves `file=`.
function assertRepoRelativeFiles(run, workspace) {
  const files = [...run.stdout.matchAll(/^::(?:error|warning|notice) file=([^,:\r\n]*)/gm)].map((m) => m[1]);
  if (files.length === 0) fail(`no annotation carries file=\n${run.output}`);
  const missing = files.filter((file) => !existsSync(join(workspace, decodeURIComponent(file))));
  if (missing.length > 0)
    fail(`file= does not name a file under GITHUB_WORKSPACE: ${missing.join(', ')}\n${run.output}`);
}

const installed = runAction('test/e2e/workspace/app', root);
if (!installed.summary.includes(`<!-- svelte-vitals v${installedVersion} -->`)) {
  fail(`the job summary was not written by the installed svelte-vitals ${installedVersion}\n${installed.output}`);
}
if (installed.stdout.includes('using the bundled svelte-vitals')) {
  fail(`the action fell back to the bundled analyzer\n${installed.output}`);
}
if (!installed.stdout.includes('::error file=') && !installed.stdout.includes('::warning file=')) {
  fail(`the second run of the installed svelte-vitals printed no annotations\n${installed.output}`);
}
assertRepoRelativeFiles(installed, root);
console.log(`e2e: the action ran the installed svelte-vitals ${installedVersion} (exit ${installed.status})`);

// No node_modules above this copy, so the action has to fall back to the bundled analyzer.
const isolated = mkdtempSync(join(tmpdir(), 'svelte-vitals-action-e2e-bundled-'));
const app = join(isolated, 'app');
cpSync(join(root, 'test/e2e/workspace/app'), app, { recursive: true });
const bundled = runAction(app, isolated);
if (!bundled.stdout.includes(`using the bundled svelte-vitals ${bundledVersion}`)) {
  fail(`the fallback message does not name the bundled svelte-vitals ${bundledVersion}\n${bundled.output}`);
}
if (!bundled.summary.includes(`<!-- svelte-vitals v${bundledVersion} -->`)) {
  fail(`the job summary does not name the bundled svelte-vitals ${bundledVersion}\n${bundled.output}`);
}
assertRepoRelativeFiles(bundled, isolated);
console.log(`e2e: the action used the bundled svelte-vitals ${bundledVersion} (exit ${bundled.status})`);
