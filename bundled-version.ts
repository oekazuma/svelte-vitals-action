import { readFileSync } from 'node:fs';

// Read from the file: svelte-vitals' exports map blocks require.resolve('svelte-vitals/package.json').
// Inside dist/index.js the analyzer's own version lookup finds this repository's package.json instead.
const { version } = JSON.parse(readFileSync('node_modules/svelte-vitals/package.json', 'utf8')) as { version: string };

export const define = { __BUNDLED_SVELTE_VITALS_VERSION__: JSON.stringify(version) };
