## Why

After native acceptance is durable and the plugin legacy owner is gone, the
external Node Synthesis service, JavaScript worker stack, differential-only
build path, and associated tests become redundant. R9 and Stage 1 cannot be
completed while those obsolete delivery and implementation surfaces remain in
the repository or build graph.

## What Changes

- **BREAKING (development tooling only)**: Delete `apps/synthesis-service`, its
  Node HTTP/lifecycle/repository/application implementation, JavaScript worker
  pool/protocol, and Node-specific runtime configuration.
- Remove the Node sidecar build/prebuild workflow, package workspace, build
  commands, benchmark/smoke scripts, release inventory, dependencies, and
  implementation-detail tests.
- Replace executable Node differential gates with accepted language-neutral
  corpora, Rust-owned invariants, and public observable-behavior tests; delete
  tests that only lock Node classes, module resolution, internal worker messages,
  or build output.
- Prune unreachable TypeScript engine/application/repository implementations
  while retaining `synthesis-contracts` and any pure plugin-owned DTO,
  canonicalization, projection, or Host-boundary logic with current callers.
- Make source, build, package, freshness, SBOM/provenance, and XPI inventories
  native-only. Node, npm, JavaScript service, D3 runtime, and re-enable switches
  must be absent.
- Run the final seven-platform candidate, size, clean/upgrade/corrupt/crash/offline
  install, backup/restore, and real-machine acceptance gates before declaring
  R9 or Stage 1 complete. This change defines those gates but does not authorize
  release publication or Gitee synchronization.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-rust-sidecar-migration-governance`: Complete R9b by retiring the
  executable Node oracle and requiring final cross-platform acceptance.
- `synthesis-sidecar-stage1-node-milestone-gate`: Replace the transitional
  development-only Node allowance with a zero-Node source/build/runtime rule.
- `synthesis-sidecar-runtime-packaging`: Remove Node-era build and inventory
  surfaces and retain only manifest-v2 Rust delivery.
- `synthesis-worker-source-build-parity`: Retire TypeScript/Node worker build
  parity and make Rust source/build/operation parity the only worker gate.
- `synthesis-sidecar-service-boundary`: Make the Rust executable the sole
  Synthesis service implementation while keeping Zotero/Host authority in the
  plugin.

## Impact

- Deletes `apps/synthesis-service/**`, the Node sidecar workflow and scripts,
  Node-only tests, package workspace entries, dependencies, and obsolete release
  inventory.
- Prunes `packages/synthesis-engine`, `packages/synthesis-application`, and
  `packages/synthesis-repository` by reachability; it does not delete
  `packages/synthesis-contracts` or plugin-required pure logic.
- Updates Stage-1 test-suite governance, package/XPI checks, Synthesis docs, and
  the Rust migration plan.
- Depends on both `stabilize-synthesis-r9a-retirement-baseline` and
  `remove-synthesis-plugin-legacy-owner`; no release may occur between them.
