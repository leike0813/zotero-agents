# Proposal

## Why

Lexical scans can exhaust the execution deadline before the published vector index is searched. Slow encoders and large indexes also encounter inconsistent deadlines across callers.

## What Changes

- Give query encoding, exact scoring and evidence verification independent bounded phases.
- Keep verified results when another search phase reaches its budget.
- Apply the same foreground budget across native and Bridge callers and propagate cancellation to in-flight encoding.

## Capabilities

### Modified Capabilities

- `synthesis-vector-retrieval` owns the timing and coverage of vector search and maintenance.
- `synthesis-search-contracts` owns partial results and continuations for mixed searches.

## Impact

Synthesis application and sidecar, Zotero Host Broker, Workbench, CLI and MCP transport policy.
