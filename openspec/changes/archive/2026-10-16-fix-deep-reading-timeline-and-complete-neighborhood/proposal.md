# Proposal

## Why

Deep-reading HTML omits timelines even when the current paper is a canonical Topic source. Citation slices ignore requested depth, persisted layouts exclude single-source external references, and standalone visibility applies overview filtering to an already bounded paper neighborhood.

## What Changes

- Find associated Topics from both resolved membership and existing canonical source-reference projections.
- Honor bounded graph depth, direction, filters, and basis consistently across slice and layout reads; deep reading requests two hops.
- Include single-source external references in bounded shared persisted layouts while preserving the Workbench overview topology.
- Give standalone deep-reading graphs an explicit neighborhood visibility mode and resolve the current paper using its portable paper ref.
- Preserve read-only embedding, stale-layout diagnostics, and omission when coordinates are unavailable.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-deep-reading-skill`: two-hop neighborhood rendering and current-paper focus over Host-provided coordinates.
- `synthesis-native-citation-graph-surface`: depth-aware bounded reads and shared layout coverage distinct from overview visibility.
- `synthesis-sidecar-topic-application-foundation`: associated Topic lookup includes existing source-paper membership.

## Impact

Rust Topic and Citation Graph application/repository/read adapters, shared persisted layout generation/version, standalone graph visibility and export contracts, deep-reading runtime and generated Skill, existing regression tests and Synthesis documentation. No new dependency, canonical data migration, automatic maintenance dispatch, or publication is required.
