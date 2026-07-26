## 1. Contract and test baseline

- [x] 1.1 Add failing TypeScript contract, application, cache-staleness, pool, runtime-packaging, and boundary tests for Layout v2 and Node/D3 removal.
- [x] 1.2 Add failing Rust and cross-language fixtures for force/radial/components, invalid DTOs, deterministic repeats, cancellation, and quality invariants.
- [x] 1.3 Freeze reviewed quality thresholds and maximum-profile deadline/RSS acceptance without exact cross-architecture coordinate snapshots.

## 2. Rust layout engine

- [x] 2.1 Pin the Synthesis native workspace to `nightly-2026-07-25`, add exact `forceatlas2 0.8.0` without default features, and update Cargo workspace/lock.
- [x] 2.2 Add `synthesis-citation-layout` with strict v2 DTO rebuilding, stable ordering, result validation, and layout hashing.
- [x] 2.3 Implement fixed-parameter ForceAtlas2 with application initial positions, iterative cancellation, isolated-node placement, and 0.001 rounding.
- [x] 2.4 Port radial/components ordering, spacing, golden-angle, and rounding semantics to the Rust crate.
- [x] 2.5 Register `citation_graph_layout.v2` in the protocol and native worker with stable errors and cancellation.

## 3. Production routing and cache migration

- [x] 3.1 Update TypeScript v2 request/result rebuilders, engine identities, persisted legacy/current layout types, hashes, and stale-cache detection.
- [x] 3.2 Route authenticated `compute.citation_graph_layout` through the existing Rust child while retaining the public capability and client API.
- [x] 3.3 Preserve plugin-owned graph capture, five-second deadline, basis CAS, promotion, diagnostics, previous-layout retention, and no-fallback behavior.
- [x] 3.4 Verify same-target three-run determinism, reviewed graph quality, cancellation acknowledgement, maximum profile deadline, and peak RSS.

## 4. Node and D3 deletion

- [x] 4.1 Delete the Node layout worker and worker_threads backend switching while preserving one-active/two-queued pool/fuse/shutdown behavior.
- [x] 4.2 Delete TypeScript layout kernels and direct-compute helpers, leaving environment-neutral DTO/projection code as the single TypeScript contract boundary.
- [x] 4.3 Remove `d3-force`, `@types/d3-force`, and all D3 runtime/license/fingerprint/XPI inventory.

## 5. Build, packaging, and documentation

- [x] 5.1 Update Synthesis package scripts and build workflows for the dated nightly without changing other Rust workspaces.
- [x] 5.2 Update fifteen-operation source/build fingerprint, worker smoke, runtime freshness, dependency provenance, and candidate packaging checks.
- [x] 5.3 Update current-state developer/help documents for ForceAtlas2/Rust v2 and correct the archived-R5 documentation drift.
- [x] 5.4 Verify five target candidate contracts and per-target 15 MiB / aggregate 75 MiB gates without dispatching or publishing.

## 6. Acceptance

- [x] 6.1 Run pinned Rust fmt/check/test and the cross-language contract checker.
- [x] 6.2 Run targeted layout/application/pool/runtime/boundary checks, Stage-1 tests, typecheck, lint, format check, and production build.
- [x] 6.3 Run `git diff --check` and strict OpenSpec validation, record any environment-only or remote-only remaining evidence, and leave the active change ready for verify.
