import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const version = '0.44.0';

function fail(message) {
  console.error(`e2e: ${message}`);
  process.exit(1);
}

if (!existsSync(join(root, 'test/e2e/workspace/node_modules/svelte-vitals/package.json'))) {
  fail("the fixture is not installed: run 'npm ci --ignore-scripts' in test/e2e/workspace");
}

const summary = join(mkdtempSync(join(tmpdir(), 'svelte-vitals-action-e2e-')), 'summary.md');
writeFileSync(summary, '');

// Inherited runner variables (a token, the real event payload) would make local and CI runs differ.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('GITHUB_') && !key.startsWith('INPUT_'))
);
Object.assign(env, {
  INPUT_PATH: 'test/e2e/workspace/app',
  GITHUB_WORKSPACE: root,
  GITHUB_STEP_SUMMARY: summary,
  GITHUB_EVENT_NAME: 'push',
  GITHUB_REPOSITORY: 'oekazuma/svelte-vitals-action'
});

const child = spawnSync(process.execPath, ['dist/index.js'], { cwd: root, env, encoding: 'utf8' });
const output = `stdout:\n${child.stdout}\nstderr:\n${child.stderr}`;

if (!readFileSync(summary, 'utf8').includes(`<!-- svelte-vitals v${version} -->`)) {
  fail(`the job summary was not written by the installed svelte-vitals ${version}\n${output}`);
}
if (child.stdout.includes('analyzed with the bundled svelte-vitals')) {
  fail(`the action fell back to the bundled analyzer\n${output}`);
}
if (child.status !== 0 && child.status !== 1) {
  fail(`the action exited with ${child.status ?? child.signal}\n${output}`);
}
console.log(`e2e: the action ran the installed svelte-vitals ${version} (exit ${child.status})`);
