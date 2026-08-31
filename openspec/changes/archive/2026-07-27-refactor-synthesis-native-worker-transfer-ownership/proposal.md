## Why

The R8 native runtime still combines worker framing, capability dispatch, and service composition in one 1,407-line module, while Citation Graph large transfer bypasses the shared compute authority and calls the graph kernel directly from its owner. This leaves worker reuse, transfer durability, fault isolation, and ownership enforcement weaker than the already-declared native runtime contract.

## What Changes

- Split the native runtime into worker framing, persistent worker-pool ownership, disk-backed transfer ownership, capability dispatch, and service composition modules.
- Route both direct and paged Citation Graph Build through one lazy, reusable Rust child governed by one-active/two-queued admission, deadlines, cancellation, replacement, shutdown, and three-failure fuse rules.
- Stage transfer input and attempt output beneath an isolated profile runtime root with bounded sessions, bytes, TTL, reaping, atomic page publication, retry preservation, cancel deletion, and restart cleanup.
- Introduce typed `WorkerOperation`, `PagedInputSource`, and `PagedOutputSink` boundaries without a dynamic registry or generic transfer state machine.
- Add native worker-transfer differential, fault, integration, ownership, performance, and candidate-workflow gates while keeping Node implementations as read-only migration oracles.
- Correct stale R7/R8 status statements in the Synthesis architecture README.
- Preserve all public transfer DTOs, errors, hashes, ordering, health snapshots, manifest v2, SQLite schema, production owners, and `SynthesisClient` routing.

## Capabilities

### New Capabilities

- `synthesis-native-worker-transfer-ownership`: Defines the native module ownership, typed worker execution boundaries, disk-backed transfer lifecycle, and atomic publication contract.

### Modified Capabilities

- `synthesis-sidecar-compute-worker-pool`: Requires one persistent reusable Rust child for direct and paged operations with shared admission, replacement, fuse, and shutdown behavior.
- `synthesis-citation-graph-build-packed-worker-canary`: Requires the native transfer path to stream canonical pages through the shared child instead of calling the graph kernel from transfer ownership.
- `synthesis-citation-graph-build-large-transfer-contract`: Adds disk staging, attempt rollback, retry, TTL/reap, restart cleanup, and service-wide capacity requirements without changing the external lifecycle.
- `synthesis-sidecar-shutdown-drain`: Requires queued and active worker work, the control pipe, child process, and transfer staging cleanup to finish within existing shutdown bounds.
- `synthesis-persistence-performance`: Adds page-first disk transfer and control-plane responsiveness gates for 15 MiB and 75 MiB native workloads.
- `synthesis-invariant-guardrails`: Adds static ownership guards preventing transfer-to-kernel and worker-to-application authority leaks.
- `synthesis-rust-sidecar-migration-governance`: Adds local worker-transfer parity and five-platform candidate checker requirements while preserving the R8/R9 boundary.
- `synthesis-sidecar-compute-wire-capacity`: Clarifies that paged transfer bytes are bounded by transfer storage and frame limits rather than the monolithic compute HTTP envelope.

## Impact

The change affects the Rust `synthesis-sidecar` runtime modules, related Core and Rust tests, a new parity corpus/checker, Stage-1 and candidate workflow gates, and Synthesis runtime documentation. It adds no dependency, database migration, public capability, production route, Host permission, mutation authority, release dispatch, or Gitee synchronization.
