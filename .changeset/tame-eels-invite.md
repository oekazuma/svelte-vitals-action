---
'@svelte-vitals/action': patch
---

Surface the analyzer's non-fatal warnings as workflow annotations. `analyzeProject` reports config-file problems, version-floor notices, unparseable files it skipped, and rules that crashed and were dropped from the run — the action collected all of it and printed none of it.

The crashed-rule case is why this matters now. A rule that throws no longer aborts the analysis; the run completes without it and its weight leaves the Health denominator, so nothing about the report looks wrong. Before, the exception propagated and failed the job outright. Without this, an incomplete scan passed the gate with no trace of which rule was missing.

The gate is unchanged — these are annotations, not failures.
