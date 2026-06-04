# Add Synthesis Index Cluster Dedupe Harness

## Summary

Add a long-lived external harness for Synthesis Index/reference algorithm
debugging and implement a new cluster-first canonical dedupe algorithm as a
pure matcher function. The harness reads the Zotero SQLite database and the
Synthesis plugin SQLite database, runs the cluster dedupe algorithm, and writes
only to an isolated debug SQLite database.

## Motivation

The previous pairwise canonical dedupe output produced noisy `canonical_merge`
reviews, especially for title-containment cases where bibliographic extraction
noise and true semantic title extensions were both represented as the same
high-looking score. We need a stable external harness to inspect current
library/reference state, run the cluster algorithm without mutating production
state, and compare cluster evidence. A later production-promotion change wires
the same cluster algorithm into plugin Advanced Reference Matching.

## Scope

- Add `dedupeCanonicalReferencesClustered()` to the reference matcher module.
- Add `tools/synthesis-index-harness` as a developer tool with CLI, read model,
  debug SQLite persistence, and a simple browser UI.
- Keep harness persistence isolated from production rows. Production wiring is
  handled by `promote-cluster-reference-dedupe-to-production`.
- Update docs and skill guidance so realtime index/matcher debugging uses the
  new tools harness instead of the old fixture-only benchmark scripts.

## Non-Goals

- Do not write harness results back to the real plugin database.
- Do not replace Workbench Review UI in this change.
- Do not add npm dependencies.
- Do not simulate reference sidecar refresh or citation graph rebuild in v1.
