## ADDED Requirements

### Requirement: Fifteen production operations SHALL share one Rust child authority

The fourteen migrated operations and `citation_graph_layout.v2` SHALL share one lazily spawned Rust child beneath the existing one-active/two-queued admission, deadlines, cancellation grace, replacement accounting, shutdown, and three-runtime-failure degraded fuse.

#### Scenario: Layout follows another Rust operation

- **WHEN** an admitted layout task follows any other operation
- **THEN** the same child backend and pool state SHALL execute it without backend switching or a second worker authority.

#### Scenario: Mixed queue is full

- **WHEN** one of the fifteen operations is active and two operations are queued
- **THEN** another supported request SHALL fail immediately with `worker_busy`.

#### Scenario: Layout times out or crashes

- **WHEN** active layout exceeds five seconds or terminates the child
- **THEN** only that task SHALL fail, the child SHALL be replaced under existing rules, and fault/fuse accounting SHALL remain shared.

## REMOVED Requirements

### Requirement: Citation Graph layout is the only production worker kernel

**Reason**: The Node production worker is deleted and layout becomes the fifteenth operation in the existing Rust child.

**Migration**: Schedule `citation_graph_layout.v2` through the single Rust-only compute pool.

### Requirement: Streaming transfer shares bounded worker admission and failures

**Reason**: The Node/Rust backend distinction and switching behavior disappear when the final Node kernel migrates.

**Migration**: All operations continue to share the same admission and failures under the new single-Rust-child requirement.
