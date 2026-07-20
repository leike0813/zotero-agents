## Why

The Rust sidecar currently owns only Citation Graph Metrics while five private deterministic operations still execute in the Node worker. Migrating this complete R4 group now reuses the proven native worker boundary, removes the remaining duplicated sidecar compute path for these domains, and makes their cross-language ordering and large-payload behavior explicit.

## What Changes

- Make Rust the only active private-sidecar implementation of Tag Vocabulary validation/index, Concept KB index/query, and Topic Graph index.
- Generalize the Metrics-named child transport into one Rust compute transport while preserving the existing shared queue, five-second deadline, cancellation, replacement, shutdown, and degraded fuse.
- Add bounded canonical input/output page frames with per-page acknowledgement so valid large private aggregates do not depend on one eight-MiB JSON-lines frame.
- Replace locale-dependent engine ordering with the existing UTF-16 contract comparator and freeze Unicode/case behavior in reviewed cross-language corpus cases.
- Preserve dynamic JavaScript `tagPattern` semantics in Rust through a pinned ECMAScript regular-expression implementation with UTF-16/UCS-2 matching.
- Delete the five active Node worker branches and the Tag Vocabulary/Concept KB test-only Node worker fixtures after Rust parity is established; retain the production TypeScript engines as plugin implementations and differential oracles, and retain Topic Graph source/build Worker parity.

## Capabilities

### New Capabilities

- `synthesis-rust-sidecar-deterministic-kernels`: Defines the five native deterministic operations, strict paged worker protocol, cross-language parity, dependency/resource gates, and current private-only routing boundary.

### Modified Capabilities

- `synthesis-tag-vocabulary-engine`: Requires explicit cross-language ordering, ECMAScript pattern parity, and Rust execution for the private sidecar route.
- `synthesis-concept-kb-index-engine`: Requires explicit cross-language ordering and Rust index/query execution for the private sidecar route.
- `synthesis-topic-graph-index-engine`: Requires explicit cross-language ordering and Rust index execution for the private sidecar route.
- `synthesis-sidecar-compute-worker-pool`: Extends the existing single admission/failure state machine and Rust backend to the five deterministic operations with paged frames.
- `synthesis-worker-source-build-parity`: Retains the Topic Graph source/build TypeScript Worker canary while the private sidecar route moves to Rust.

## Impact

- Cross-language compute schemas, manifest inventory, positive/negative corpus, and fingerprint.
- Three new native domain crates, the shared Rust protocol/executable, Cargo lock/license inventory, and five-target candidate smoke coverage.
- Synthesis service compute protocol, child transport, worker pool, Node worker branches, private application integration tests, packaging freshness, and migration current-state documentation.
- One new direct dependency, pinned `regress` with UTF-16 support; no new public capability, HTTP route, application DTO, persistence owner, production plugin route, runtime manifest version, deadline, resource target, or fallback path.
