import { MIN_CLI_VERSION, type CliResolution } from './resolve-cli.js';

export interface FallbackMessage {
  level: 'warning' | 'notice';
  text: string;
}

export function fallbackMessage(
  resolution: Exclude<CliResolution, { kind: 'installed' }>,
  bundledVersion: string
): FallbackMessage {
  const lead = `svelte-vitals: analyzed with the bundled svelte-vitals ${bundledVersion}.`;
  if (resolution.kind === 'too-old') {
    return {
      level: 'warning',
      text: `${lead} The installed svelte-vitals ${resolution.version} is older than ${MIN_CLI_VERSION}, the oldest version this action can run.`
    };
  }
  if (resolution.declared !== undefined) {
    return {
      level: 'warning',
      text: `${lead} This project declares svelte-vitals ${resolution.declared} but it is not installed. Install dependencies before this step to analyze with the project's version.`
    };
  }
  return {
    level: 'notice',
    text: `${lead} Add svelte-vitals as a devDependency and install it before this step to choose the version CI analyzes with.`
  };
}
