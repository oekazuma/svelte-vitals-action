import { isAbsolute, posix, relative, sep } from 'node:path';

const ESCAPED: Record<string, string> = { '%25': '%', '%0D': '\r', '%0A': '\n', '%3A': ':', '%2C': ',' };

/** Workflow-command property escaping, as the svelte-vitals github reporter applies it. */
function escapeProp(s: string): string {
  return s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/:/g, '%3A').replace(/,/g, '%2C');
}

/**
 * The svelte-vitals github reporter writes `file=` relative to the analyzed project, but GitHub
 * resolves it against the workspace; this rewrites it to be workspace-relative. The reporter always
 * puts `file=` first, so a `file=` inside a title or message is never touched.
 */
export function repoRelativeAnnotations(text: string, projectDir: string, workspace: string): string {
  const rel = relative(workspace, projectDir);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return text;
  const prefix = rel.split(sep).join('/');
  return text.replace(/^(::(?:error|warning|notice) file=)([^,:\r\n]*)/gm, (line, head: string, value: string) => {
    const file = value.replace(/%(?:25|0D|0A|3A|2C)/g, (e) => ESCAPED[e]!);
    // A file in a sibling workspace package is reported as `../ui/...`.
    const joined = posix.join(prefix, file);
    if (file.startsWith('/') || joined === '..' || joined.startsWith('../')) return line;
    return head + escapeProp(joined);
  });
}
