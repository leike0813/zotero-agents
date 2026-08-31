## ADDED Requirements

### Requirement: Topic Graph private compute SHALL use explicit Rust semantics
Topic node, edge, root, and unplaced ordering SHALL use explicit UTF-16 comparison and private-sidecar index computation SHALL execute in Rust without changing root, level, deletion, broader-relation, or status semantics.

#### Scenario: Topic Graph index is rebuilt in Rust
- **WHEN** a canonical bounded Topic Graph request is submitted through the shared pool
- **THEN** the Rust result SHALL equal the strict TypeScript oracle result including suggested, confirmed, stale, deleted, and rejected parent-status behavior.

