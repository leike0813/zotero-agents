## Context

The Node sidecar currently owns HTTP authentication, request bounds, a one-active/two-waiting compute pool, a five-second deadline, cancellation grace, worker replacement, and a three-failure degraded fuse. Metrics, layout, build, and several private kernels share one Node `Worker`. R1 froze the v1 schemas and canonical corpus, while runtime manifest v2 and the native supervisor are intentionally deferred.

This slice must therefore replace only Metrics computation while keeping the current service connection and shared admission authority. The native binary is a verified ancillary file in the temporary v1 Node oracle bundle; it is not the v1 main executable or a formal XPI runtime.

## Goals / Non-Goals

**Goals:**

- Make Rust the only active Metrics v2 kernel with exact observable parity.
- Preserve one queue/fuse/deadline/cancellation state machine across both worker backends.
- Prove one native executable's worker framing, candidate HTTP path, five-target portability, provenance, and size.
- Keep cross-language ordering, canonical bytes, hashes, and validation explicit.

**Non-Goals:**

- Runtime manifest v2, native installer/supervisor/discovery cutover, production database or canonical ownership.
- Migrating layout, build, deterministic kernels, repository, or application layers.
- Adding async HTTP, SQLite, system-runtime discovery, downloaded runtime, or a Node fallback.
- Enforcing platform OS-level RSS controls; this slice uses bounded DTOs, measured peak RSS, deadline, and kill isolation.

## Decisions

### Use a small three-crate workspace

`synthesis-protocol` owns strict DTOs, canonical JSON, hashes, and worker/HTTP envelopes. `synthesis-metrics` owns the Metrics v2 algorithm. `synthesis-sidecar` owns the executable's `worker` and candidate `serve` modes. Empty repository/application crates are not created. Dependencies are limited to `serde`, `serde_json`, and `sha2`, with an exact toolchain and committed lockfile.

### Keep Node as the temporary protocol front door

The plugin continues to call `compute.citation_graph_metrics` over the current authenticated v1 service. The server continues to delegate to `SynthesisSidecarComputeWorkerPool.runCitationGraphMetrics`; only that task's backend changes. The plugin adapter, connection, DTO, deadline, graph-basis validation, promotion, and canonical application hash remain unchanged.

### Preserve a single pool state machine

The existing queue and active task remain the SSOT. Backend sessions normalize result, cancellation, error, and exit events. Metrics selects a lazily spawned Rust child; other tasks select the existing Node Worker. A backend switch normally terminates the idle previous backend without incrementing failure counters, so only one compute worker is resident. Timeout, crash, malformed or wrong-task frames, and spawn failure use existing worker errors and the same consecutive-failure fuse.

An independent Metrics pool beside the server switch is rejected because it would bypass shared admission, shutdown, and degraded state. Catch-and-run-Node fallback is forbidden.

### Use bounded JSON-lines worker framing

Frames carry protocol, type, task id, operation, and request/result or error data. Stdout contains frames only; diagnostics use stderr. A reader thread observes cancel while the compute thread checks an atomic flag at Metrics phase and PageRank checkpoints. After the existing 100 ms grace the parent kills an unresponsive child. Late, duplicate, or wrong-task frames are invalid results and cannot settle a later task.

### Make ordering explicit before comparing languages

Metrics identifiers and hints use the R1 UTF-16 code-unit comparator instead of implicit `localeCompare`. Existing production fixtures and hashes must remain unchanged. Gold request/result cases lock canonical bytes and SHA-256; Rust consumes the same corpus and Metrics v2 constants, one-millionth rounding, sorting, formulas, and diagnostics.

### Carry Rust inside v1 without redefining v1

The binary and provenance live at a fixed bundle-relative path and are included in `manifest.files` with hashes and executable metadata. Production resolution never reads PATH or environment variables; tests may inject an explicit fixture path. The v1 main Node executable, entrypoint, launch/discovery fields, and active/previous pointers do not change. A separate native workflow builds and smokes five target candidates; current Node prebuild assembly may stage the matching ancillary binary but no formal XPI publication is added.

### Keep candidate HTTP minimal and dependency-free

`serve` uses the Rust standard library on loopback and supports v1 health, handshake, authenticated Metrics call, and shutdown sufficient for direct candidate integration. It spawns the same executable in `worker` mode. Full native lifecycle, repository surfaces, and production supervisor identity remain R8 work.

## Risks / Trade-offs

- [Cross-language float or ordering drift] → Add reviewed request/result gold cases, exact DTO comparison, canonical bytes/hash checks, and Unicode identifiers before activating Rust.
- [Two backends split admission or fuse state] → Keep one queue/pump and normalize only backend sessions; extend Core 195 with mixed-backend failures.
- [Cancellation cannot interrupt Rust compute] → Keep stdin reading independent, use atomic checkpoints, then enforce grace-and-kill for hangs.
- [Test failure modes leak into production binary] → Build a separate fixture child for hang/crash/invalid-frame tests.
- [Ancillary binary cannot be trusted] → Resolve within the immutable bundle, verify manifest hash/provenance and the worker ready fingerprint, and fail closed.
- [Native resource use is misstated] → Gate the largest valid Metrics request below 256 MiB peak RSS and retain process kill isolation; defer Job Object/rlimit policy to native supervision.
- [Candidate artifacts exceed delivery goals] → Fail at 15 MiB compressed per target or 75 MiB total before adding more dependencies.

## Migration Plan

1. Extend the corpus and tests while Node remains the oracle.
2. Implement Rust protocol/engine/worker and obtain exact parity.
3. Add the Rust backend to the shared pool, migrate HTTP integration, then delete the active Node worker Metrics branch.
4. Add candidate serving, ancillary packaging, provenance, size checks, and five-target CI.
5. Keep TypeScript oracle fixtures for later slices; do not archive R1 or enter manifest v2.

## Open Questions

None. OS-level hard RSS enforcement and native manifest/supervisor identity are explicitly assigned to the later native runtime change.
