---
'@svelte-vitals/action': minor
---

Update the bundled analyzer to `svelte-vitals` 0.54.2 / `@svelte-vitals/core` 0.51.0. The action's inputs and outputs are unchanged, and the step still fails on `failOn` severity rather than on any score. What changes is what the scan reports:

- **One new rule, on by default at `warning`: `a11y/aria-hidden-focus`.** It reports a keyboard-focusable element hidden from assistive technology by a literal `aria-hidden="true"`, on the element itself or on an ancestor. An expression-valued `aria-hidden` (`aria-hidden={!open}`) is unknowable and stays silent; a negative or expression `tabindex`, a `disabled` form control, and anything at or under an `inert` element are exempt as not focusable. Under the default `failOn: critical` it adds annotations and moves the Accessibility score without being able to fail the step; a project on `failOn: warning` can turn red on it.
- **Landmark findings move in both directions.** Mixed-case landmark tags (`<heaDer>`) are now matched, a `<svelte:element this="nav">` with a literal tag now contributes that landmark instead of only demoting its children, and an ARIA fallback role list (`role="section main"`) resolves to the first concrete role the way browsers do. `a11y/duplicate-landmark` and `a11y/top-level-landmark` can gain or lose findings on affected routes.
- **Mixed-case tags no longer skew ARIA rules.** `a11y/disallowed-aria-props` and `a11y/deprecated-aria` now resolve the implicit role of a `<dIv>`-style tag, so findings they silently dropped reappear, and `a11y/required-aria-props` stops reporting a missing prop on a mixed-case native control that already supplies it.
- **A tag named like an `Object.prototype` key (`<constructor>`) no longer crashes `a11y/deprecated-attr`.** The crash dropped the rule from scoring with only a workflow warning; routes containing such an element are now scored on it.
- **Fewer `performance/render-blocking-script` false positives.** A `<script>` whose `type` is whitespace-only or wrapped in U+00A0 is a data block per the HTML spec and is no longer flagged.
- **Symlinked directories are no longer traversed during file discovery**, now that the analyzer uses Node's built-in `fs.glob`. Files reachable only through a directory symlink drop out of the scan and its scores.
