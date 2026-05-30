## Why

Synthesis citation graph correctness depends on reference resolution, but the
current resolver is both too conservative and hard to tune safely. Recent
debugging showed many obvious library references remain unresolved while
near-neighbor papers such as `Transtrack`/`MOTR` must not be auto-merged.

## What Changes

- Add a full-current-library reference resolution fixture with gold labels and
  explicit dangerous near-neighbor pairs.
- Add a repeatable evaluation harness for reference matching policies and
  metrics.
- Document reference normalization and matching rules separately from topic
  discovery metadata.
- Extract the matcher out of `literatureRegistry.ts` into a reusable matcher
  module.
- Make matcher output layered: conservative `matched` results for graph facts,
  and weaker `suggested_candidates` for review/UI diagnostics.

## Capabilities

### New Capabilities

- `synthesis-reference-resolution-matcher`: DB-first reference identity
  matching, benchmark fixtures, evaluation metrics, and layered matcher output.

### Modified Capabilities

- `synthesis-literature-registry-citation-graph`: reference resolutions use the
  new matcher and preserve low-confidence candidates without creating matched
  citation edges.

## Impact

- Synthesis matcher code and literature registry ingestion.
- Test fixtures under `test/fixtures/synthesis-reference-resolution`.
- Synthesis layer documentation and experiment reports.
- Core tests for matcher units, fixture validation, evaluation metrics, and
  integration behavior.
