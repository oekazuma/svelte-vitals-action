import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { repoRelativeAnnotations } from '../src/annotation-paths.js';

const WS = join('/', 'ws');
const APP = join(WS, 'apps', 'web');

describe('repoRelativeAnnotations', () => {
  it('prefixes file= with the project directory relative to the workspace', () => {
    expect(repoRelativeAnnotations('::error file=src/routes/+page.svelte,line=3,title=t::m', APP, WS)).toBe(
      '::error file=apps/web/src/routes/+page.svelte,line=3,title=t::m'
    );
  });

  it('returns the text unchanged when the project is the workspace', () => {
    const text = '::warning file=./src/a%3A.svelte,title=t::m\r\nplain\n';
    expect(repoRelativeAnnotations(text, WS, WS)).toBe(text);
  });

  it('returns the text unchanged when the project is outside the workspace', () => {
    const text = '::error file=src/a.svelte,title=t::m';
    expect(repoRelativeAnnotations(text, join('/', 'elsewhere'), WS)).toBe(text);
    expect(repoRelativeAnnotations(text, join('/', 'wsx'), WS)).toBe(text);
  });

  it('escapes the prefix as a workflow-command property', () => {
    expect(repoRelativeAnnotations('::error file=src/a.svelte,title=t::m', join(WS, 'a,b:c%d'), WS)).toBe(
      '::error file=a%2Cb%3Ac%25d/src/a.svelte,title=t::m'
    );
  });

  it('keeps an already-escaped file value escaped once', () => {
    expect(repoRelativeAnnotations('::error file=src/x%2Cy%25.svelte,title=t::m', APP, WS)).toBe(
      '::error file=apps/web/src/x%2Cy%25.svelte,title=t::m'
    );
  });

  it('resolves a file in a sibling workspace package against the prefix', () => {
    expect(repoRelativeAnnotations('::error file=../ui/src/Button.svelte,title=t::m', APP, WS)).toBe(
      '::error file=apps/ui/src/Button.svelte,title=t::m'
    );
  });

  it('leaves a file that resolves outside the workspace, or an absolute one, unchanged', () => {
    const text = '::error file=../../../x.svelte,title=t::m\n::error file=/abs/x.svelte,title=t::m';
    expect(repoRelativeAnnotations(text, APP, WS)).toBe(text);
  });

  it('leaves commands without file= and other lines unchanged', () => {
    const text =
      '::warning title=seo/robots-txt%3A robots.txt::Missing robots.txt\n' +
      'svelte-vitals: file=src/a.svelte\n' +
      '::error title=file=x::file=src/a.svelte\n';
    expect(repoRelativeAnnotations(text, APP, WS)).toBe(text);
  });

  it('rewrites every annotation line and keeps CRLF line endings', () => {
    expect(
      repoRelativeAnnotations(
        '::error file=src/a.svelte,title=t::m\r\n::warning file=src/b.svelte,line=1,title=t::m\r\n',
        APP,
        WS
      )
    ).toBe(
      '::error file=apps/web/src/a.svelte,title=t::m\r\n::warning file=apps/web/src/b.svelte,line=1,title=t::m\r\n'
    );
  });
});
