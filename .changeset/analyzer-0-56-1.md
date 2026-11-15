---
'@svelte-vitals/action': patch
---

Update the bundled analyzer to `svelte-vitals` 0.56.1 / `@svelte-vitals/core` 0.56.1. The action's inputs and outputs are unchanged. The only rule that moves is `a11y/permitted-contents`, which now follows `@markuplint/html-spec` 5.5.0. At its default severity it reports warnings and info, so on the default `failOn: critical` it does not make a step start or stop failing:

- A `<style>` that is the first element child of a parent expecting flow content is no longer reported. It is still reported when an element outside any block comes before it in the same parent. When only elements inside a block, a component or `{@html}` may come before it, the rule stays silent.
- `<footer>` inside `<address>` is now reported.
- `<template>` inside a `<colgroup>` without `span`, and `<script>` or `<template>` inside `<thead>`, `<tbody>` or `<tfoot>`, are no longer reported. A finding inside a table section now reads "admits only `<tr>` and script-supporting elements".
