import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveProjectCli } from '../src/resolve-cli.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'resolve-cli-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function writeJson(path: string, content: string): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content);
}

function install(dir: string, version: string, bin: unknown = { 'svelte-vitals': './dist/bin.js' }): void {
  writeJson(
    join(dir, 'node_modules/svelte-vitals/package.json'),
    JSON.stringify({ name: 'svelte-vitals', version, bin })
  );
}

describe('resolveProjectCli', () => {
  it('finds an install in the project directory', () => {
    install(root, '0.55.5');
    expect(resolveProjectCli(root, root)).toEqual({
      kind: 'installed',
      version: '0.55.5',
      bin: join(root, 'node_modules/svelte-vitals/dist/bin.js')
    });
  });

  it('finds an install hoisted above the project directory', () => {
    install(root, '0.55.5');
    const projectDir = join(root, 'apps/web');
    mkdirSync(projectDir, { recursive: true });
    expect(resolveProjectCli(projectDir, root)).toEqual({
      kind: 'installed',
      version: '0.55.5',
      bin: join(root, 'node_modules/svelte-vitals/dist/bin.js')
    });
  });

  it('prefers the nearest install', () => {
    const projectDir = join(root, 'apps/web');
    install(projectDir, '0.50.0');
    install(root, '0.55.5');
    expect(resolveProjectCli(projectDir, root)).toMatchObject({ kind: 'installed', version: '0.50.0' });
  });

  it('does not look above stopDir', () => {
    install(root, '0.55.5');
    const projectDir = join(root, 'ws/app');
    mkdirSync(projectDir, { recursive: true });
    expect(resolveProjectCli(projectDir, join(root, 'ws'))).toEqual({ kind: 'missing' });
  });

  it('accepts a string bin field', () => {
    install(root, '0.55.5', './dist/bin.js');
    expect(resolveProjectCli(root, root)).toEqual({
      kind: 'installed',
      version: '0.55.5',
      bin: join(root, 'node_modules/svelte-vitals/dist/bin.js')
    });
  });

  it.each(['0.44.0', '0.44.1', '0.100.0', '1.0.0', '0.44.0-next.1'])('accepts %s', (version) => {
    install(root, version);
    expect(resolveProjectCli(root, root)).toMatchObject({ kind: 'installed', version });
  });

  it.each(['0.43.9', '0.9.0', '0.20.0'])('reports %s as too old', (version) => {
    install(root, version);
    expect(resolveProjectCli(root, root)).toEqual({ kind: 'too-old', version });
  });

  it.each(['devDependencies', 'dependencies'])('reports the range declared in %s when not installed', (field) => {
    writeJson(join(root, 'package.json'), JSON.stringify({ [field]: { 'svelte-vitals': '^0.55.0' } }));
    expect(resolveProjectCli(root, root)).toEqual({ kind: 'missing', declared: '^0.55.0' });
  });

  it('reports missing with no declaration', () => {
    writeJson(join(root, 'package.json'), JSON.stringify({ devDependencies: { vite: '^7.0.0' } }));
    const result = resolveProjectCli(root, root);
    expect(result).toEqual({ kind: 'missing' });
    expect('declared' in result && result.declared !== undefined).toBe(false);
  });

  it('treats an unreadable or bin-less package.json as missing', () => {
    writeJson(join(root, 'node_modules/svelte-vitals/package.json'), '{');
    expect(resolveProjectCli(root, root)).toEqual({ kind: 'missing' });

    install(root, '0.55.5', null);
    expect(resolveProjectCli(root, root)).toEqual({ kind: 'missing' });
  });

  it('keeps walking past an unusable install', () => {
    const projectDir = join(root, 'apps/web');
    writeJson(join(projectDir, 'node_modules/svelte-vitals/package.json'), '{');
    install(root, '0.55.5');
    expect(resolveProjectCli(projectDir, root)).toMatchObject({ kind: 'installed', version: '0.55.5' });
  });
});
