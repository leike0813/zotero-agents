## Why

The active Synthesis OpenSpec requirements still contain several pre-review
contracts that conflict with the current canonical design in
`doc/synthesis-layer`. In particular, the specs still allow Zotero-bound
`paper_ref` to define canonical literature identity, filtered/accepted topic
discovery hint states, graph updates without transaction-local basis promotion,
and underspecified related-items sync echo handling.

This change aligns the implementation contract before runtime work starts, so
later changes have a stable, reviewable baseline.

## What Changes

- Align literature identity requirements with selected identity anchors rather
  than default `paper_ref`-derived IDs.
- Align reference resolution requirements so low-confidence suggestions never
  create matched citation graph facts.
- Align discovery hint requirements to `open`, `rejected`, and `superseded`.
- Align runtime and graph requirements with staged promotion and transaction-
  local basis checks.
- Align related-items sync requirements with durable attempts, provenance, and
  echo suppression.
- Align performance requirements with tiered budgets and bounded diagnostics.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `synthesis-layer-doc-system`: Treat the active Synthesis docs as the source of
  implementation contract truth for the reviewed design.
- `synthesis-reference-resolution-matcher`: Require suggestions to remain
  non-materialized until confirmation.
- `synthesis-literature-registry-citation-graph`: Require identity anchors,
  staged Registry basis, derived worker commit gates, and related-items sync
  boundaries.
- `synthesis-persistence-performance`: Require tiered performance acceptance and
  bounded diagnostics.

## Impact

Affected artifacts are OpenSpec specs only. This change intentionally makes no
runtime code changes.
