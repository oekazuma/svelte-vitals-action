import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const MIN_CLI_VERSION = '0.44.0';

export type CliResolution =
  | { kind: 'installed'; version: string; bin: string }
  | { kind: 'too-old'; version: string }
  | { kind: 'missing'; declared?: string };

interface PackageJson {
  version?: unknown;
  bin?: unknown;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
}

function readPackageJson(path: string): PackageJson | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return parsed !== null && typeof parsed === 'object' ? (parsed as PackageJson) : undefined;
  } catch {
    return undefined;
  }
}

// A prerelease suffix is ignored, so 0.44.0-next.1 counts as 0.44.0.
function isAtLeast(version: string, min: string): boolean {
  const parse = (v: string) => (v.split('-')[0] ?? '').split('.').map(Number);
  const a = parse(version);
  const b = parse(min);
  for (let i = 0; i < 3; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return true;
}

/** Walks from projectDir up to and including stopDir; the first node_modules/svelte-vitals wins. */
export function resolveProjectCli(projectDir: string, stopDir: string): CliResolution {
  const stop = resolve(stopDir);
  let dir = resolve(projectDir);
  for (;;) {
    const pkgDir = join(dir, 'node_modules', 'svelte-vitals');
    const pkg = readPackageJson(join(pkgDir, 'package.json'));
    const bin =
      typeof pkg?.bin === 'string' ? pkg.bin : (pkg?.bin as Record<string, unknown> | undefined)?.['svelte-vitals'];
    if (pkg && typeof pkg.version === 'string' && typeof bin === 'string') {
      return isAtLeast(pkg.version, MIN_CLI_VERSION)
        ? { kind: 'installed', version: pkg.version, bin: join(pkgDir, bin) }
        : { kind: 'too-old', version: pkg.version };
    }
    const parent = dirname(dir);
    if (dir === stop || parent === dir) break;
    dir = parent;
  }

  const project = readPackageJson(join(projectDir, 'package.json'));
  const declared = project?.devDependencies?.['svelte-vitals'] ?? project?.dependencies?.['svelte-vitals'];
  return typeof declared === 'string' ? { kind: 'missing', declared } : { kind: 'missing' };
}
