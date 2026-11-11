import { spawn } from 'node:child_process';

export interface CliOptions {
  path: string;
  diff?: string;
  baseline?: string;
}

export function cliArgs(reporter: 'md' | 'github', opts: CliOptions): string[] {
  const args = [opts.path, '--reporter', reporter];
  if (opts.diff !== undefined) args.push('--diff', opts.diff);
  if (opts.baseline !== undefined) args.push('--baseline', opts.baseline);
  return args;
}

export interface CliRun {
  /** null when the process did not exit normally (spawn failure or signal). */
  code: number | null;
  /** '' when stdout was inherited. */
  stdout: string;
  /** '' when stderr was inherited. */
  stderr: string;
  /** Set when the process could not be started or was killed by a signal; reads after the bin path. */
  failure?: string;
}

/** capture: pipe both streams and return them. inherit: hand both to this process. */
export function runCli(bin: string, args: string[], mode: 'capture' | 'inherit'): Promise<CliRun> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [bin, ...args], {
      stdio: mode === 'capture' ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
      // The CLI reads none of the action's inputs, and one of them is the token.
      env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('INPUT_')))
    });
    // Buffers are joined only at the end so a multi-byte character split across chunks survives.
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout?.on('data', (chunk: Buffer) => out.push(chunk));
    child.stderr?.on('data', (chunk: Buffer) => err.push(chunk));
    const captured = () => ({
      stdout: Buffer.concat(out).toString('utf8'),
      stderr: Buffer.concat(err).toString('utf8')
    });

    let settled = false;
    const settle = (run: CliRun) => {
      if (settled) return;
      settled = true;
      resolve(run);
    };
    child.on('error', (error) =>
      settle({ code: null, ...captured(), failure: `could not be started: ${error.message}` })
    );
    child.on('close', (code, signal) =>
      settle(
        signal === null ? { code, ...captured() } : { code: null, ...captured(), failure: `was killed by ${signal}` }
      )
    );
  });
}
