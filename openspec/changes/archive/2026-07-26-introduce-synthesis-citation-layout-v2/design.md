## Context

R5 leaves Citation Graph layout as the only production kernel executed by the private Node worker. The layout engine package owns strict DTOs plus d3-force/radial/components algorithms, while production composition already sends the request through the authenticated sidecar and keeps graph capture, basis checks, promotion, diagnostics, and previous-layout retention in the plugin.

R6 moves that last kernel beneath the existing Rust child transport. Layout data remains rebuildable cache data: version 1.2 rows can be displayed optimistically, but only version 2 results are current. The native child receives bounded JSON DTOs and gains no DB, filesystem, repository, network, Zotero, or Host authority.

## Goals / Non-Goals

**Goals:**

- Introduce a strict `citation_graph_layout.v2` Rust operation for force, radial, and components.
- Preserve public client/API shapes and plugin-owned capture, CAS, promotion, and failure behavior.
- Remove production Node worker/D3 runtime and leave one pool, one child backend, and one failure authority.
- Make layout v2 deterministic on the same target and bounded at the existing maximum profile.
- Update cross-language, source/build parity, packaging, license, provenance, and five-target acceptance.

**Non-Goals:**

- No durable repository/application migration, native manifest v2, final sidecar cutover, or Node HTTP service deletion.
- No canonical graph/database rewrite and no runtime fallback.
- No claim of d3-force coordinate compatibility or exact ForceAtlas2 coordinate identity across CPU architectures.
- No Host Bridge toolchain or release-pipeline change.

## Decisions

### 1. One cohesive Rust layout crate

Add `synthesis-citation-layout` to own the v2 DTO validation and all three algorithms. The worker binary performs closed dispatch only, while `synthesis-protocol` continues to own common canonical JSON, framing, hashes, safe-number behavior, errors, and cancellation.

Keeping radial/components in TypeScript was rejected because it would preserve a second production backend. Putting algorithms in the worker binary was rejected because it would duplicate contract ownership and weaken unit-test boundaries.

### 2. ForceAtlas2 is a new versioned layout

Use exact dependency `forceatlas2 = { version = "=0.8.0", default-features = false }`. Since the crate uses a nightly language feature, pin only the Synthesis native workspace and its workflows/scripts to `nightly-2026-07-25`.

Force uses sorted input, application-derived finite initial positions, `f64`, 700 single-iteration steps, cancellation checks between steps, and fixed settings: theta 0.5, ka/kg/kr 1, lin-log false, strong gravity false, overlap prevention 100, speed 0.01, and node radius 24. Isolated nodes receive the existing deterministic radius-72/gap-96 post-layout spiral. Final coordinates round to 0.001.

The project and dependency are AGPL-compatible. A stable O(N²) force crate was rejected at the 5,000-node bound; a new immature graph-core dependency and a custom Barnes-Hut implementation were rejected in favor of the selected, bounded ForceAtlas2 implementation.

### 3. Preserve radial/components observable semantics

Port the existing stable node ordering, library/external/fallback spacing, component ordering/gap, golden angle, and coordinate rounding. These algorithms use v2 identities even where output coordinates match v1 because cache validity is governed by the complete layout contract version.

### 4. Strict internal v2, stable external capability

The private operation is `citation_graph_layout.v2`; the authenticated HTTP capability remains `compute.citation_graph_layout`. Results identify `forceatlas2-rust`, `radial-rust`, or `components-rust` and integer `layoutVersion: 2`.

Persisted DTOs accept legacy engine/version rows for reading and stale detection. Request/result rebuilders reject unknown semantics, invalid numbers, identifier mismatches, and incomplete node sets. Layout hashes include engine, version, parameters, and coordinates.

### 5. One Rust-only production pool

Remove the Node worker backend and route layout through the existing Rust child. The one-active/two-queued admission, five-second deadline, 100 ms cancellation grace, 500 ms shutdown, replacement accounting, and three-failure fuse remain unchanged. No failed layout executes locally.

### 6. Determinism and quality are separated

Same target plus canonical input must produce byte-stable rounded coordinates and hash across three repeats. Cross-target ForceAtlas2 output may vary slightly due to floating-point architecture; five-target acceptance therefore checks node identity, finite coordinates, non-collapsed bounds, overlap/edge-length quality, deadline, RSS, smoke, and package size rather than one global coordinate hash.

Quality thresholds are captured in reviewed fixtures before production routing. If the fixed settings miss the five-second, 256 MiB, or quality gates, implementation stops and the change artifacts are revised rather than silently tuning parameters or relaxing thresholds.

## Risks / Trade-offs

- [Nightly compiler or dependency changes reduce reproducibility] → Pin the dated toolchain and exact crate version; build with `--locked` and include both in source/provenance fingerprints.
- [ForceAtlas2 produces visually poor or collapsed graphs] → Freeze representative connected/disconnected fixtures and require bounded overlap, edge length, finite coordinates, and non-zero extent.
- [Architecture floating-point drift invalidates cache expectations] → Require exact repeatability per target while making cached layout explicitly rebuildable and avoiding cross-target hash equality as a correctness condition.
- [Removing Node worker changes pool fault behavior] → Retain the existing admission/fuse contract and add mixed-operation timeout, cancellation, crash, replacement, and shutdown tests against the Rust-only backend.
- [Legacy rows become unreadable] → Keep legacy persisted engine identifiers in the read DTO and treat them as stale; never require them as the v2 compute result.
- [Dependency increases candidate size] → Disable default features, remove D3 inventory, and require each compressed target under 15 MiB and aggregate under 75 MiB.

## Migration Plan

1. Create v2 delta specs, failing contract/application/pool/packaging tests, and reviewed layout quality fixtures.
2. Add the pinned toolchain/dependency, Rust layout crate, v2 protocol, worker dispatch, and cross-language corpus.
3. Route production layout through the Rust child and validate same-target determinism, cancellation, timeout, RSS, and quality.
4. Delete TypeScript kernels, Node worker backend, D3 dependencies/inventory, and update build/provenance/current-state documentation.
5. Run local acceptance and prepare five-target workflow acceptance. Stop with the active change ready for verify; do not archive, publish, or dispatch remotely.

Development rollback is a source revert to the pre-R6 Node layout candidate. No production data migration or runtime fallback is introduced.

## Open Questions

None. The operation identity, toolchain/dependency, algorithm settings, cache behavior, ownership, bounds, deletion scope, and acceptance boundary are fixed.
