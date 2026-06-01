## Why

The latest Synthesis design relaxes unrealistic single-budget expectations into
tiered performance guardrails and requires drift handling to remain bounded.
Those contracts need acceptance tests and diagnostics so regressions are visible
without locking fragile snapshots.

## What Changes

- Add tier-aware diagnostics for key UI read and worker paths.
- Ensure indexes exist for identity, graph basis/status, discovery, dirty event,
  job, and related-items sync queries.
- Implement bounded startup drift incident summaries for bulk/structural drift.
- Add synthetic performance acceptance coverage where practical.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `synthesis-persistence-performance`: Tiered performance and drift no-fanout
  acceptance.

## Impact

Affected implementation includes repository indexes, startup reconcile drift
classification, debug diagnostics, performance tests, and final validation.
