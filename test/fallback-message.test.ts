import { describe, it, expect } from 'vitest';
import { fallbackMessage } from '../src/fallback-message.js';

describe('fallbackMessage', () => {
  it('warns when the project declares svelte-vitals but has not installed it', () => {
    expect(fallbackMessage({ kind: 'missing', declared: '^0.55.0' }, '0.55.5')).toEqual({
      level: 'warning',
      text: "svelte-vitals: analyzed with the bundled svelte-vitals 0.55.5. This project declares svelte-vitals ^0.55.0 but it is not installed. Install dependencies before this step to analyze with the project's version."
    });
  });

  it('warns when the installed version is too old', () => {
    expect(fallbackMessage({ kind: 'too-old', version: '0.40.1' }, '0.55.5')).toEqual({
      level: 'warning',
      text: 'svelte-vitals: analyzed with the bundled svelte-vitals 0.55.5. The installed svelte-vitals 0.40.1 is older than 0.44.0, the oldest version this action can run.'
    });
  });

  it('notes how to choose the version when svelte-vitals is neither declared nor installed', () => {
    expect(fallbackMessage({ kind: 'missing' }, '0.55.5')).toEqual({
      level: 'notice',
      text: 'svelte-vitals: analyzed with the bundled svelte-vitals 0.55.5. Add svelte-vitals as a devDependency and install it before this step to choose the version CI analyzes with.'
    });
  });
});
