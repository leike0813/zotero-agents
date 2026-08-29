## Why

Production Citation Graph layout now exercises the authenticated sidecar worker,
but the pool still has only one production operation and therefore does not prove
that multiple kernels share admission, cancellation, fault isolation, and release
governance correctly. Citation Graph metrics is the smallest remaining pure
kernel with strict DTOs and existing graph-basis promotion guards.

## What Changes

- Route production Citation Graph metrics computation through the authenticated
  sidecar worker without changing the public `SynthesisClient` graph API.
- Add the fixed `citation_graph_metrics.v1` worker operation and
  `compute.citation_graph_metrics` capability while retaining the existing
  layout operation.
- Share one active slot, two waiting slots, the five-second hard deadline, worker
  replacement, failure counter, and degraded fuse across layout and metrics.
- Fail closed when the supervisor is not ready, runtime identity changes,
  transport fails, or the worker rejects/fails a task; do not wait, retry, or
  fall back to the in-process metrics engine.
- Preserve plugin ownership of graph reads, graph hash and basis checks, metrics
  promotion, canonical files, diagnostics, and retention of previous metrics.
- Reuse the synthesis-engine metrics request/result rebuilders at all process
  boundaries and factor shared compute-client transport logic instead of
  duplicating the layout path.
- Mark layout and metrics as production worker routes; keep the other six engines
  in process and retain `108 methods / 1 direct consumer` and
  `mutationEnabled: false`.
- Update bundle, fingerprint, freshness, XPI, boundary, and documentation
  governance while leaving five-platform prebuild generation and publication to
  the release workflow.

## Capabilities

### New Capabilities

- `synthesis-citation-graph-metrics-production-routing`: Defines the production
  metrics-compute route, fail-closed readiness and runtime identity policy,
  cancellation/deadline behavior, and unchanged plugin data authority.

### Modified Capabilities

- `synthesis-citation-graph`: Moves only pure metrics computation across the
  sidecar boundary while retaining graph reads, basis validation, and promotion
  locally.
- `synthesis-sidecar-compute-worker-pool`: Adds metrics as the second fixed
  production operation in the existing globally bounded pool.
- `synthesis-sidecar-runtime-foundation`: Advertises and authenticates the
  metrics compute capability with strict request/result rebuilding.
- `synthesis-sidecar-runtime-supervision`: Applies fresh ready-connection lookup,
  restart identity invalidation, and lifecycle cancellation to metrics calls.
- `synthesis-sidecar-runtime-packaging`: Includes the multi-operation worker and
  metrics engine route in source fingerprints and release prerequisites.
- `synthesis-invariant-guardrails`: Allows exactly two production worker routes
  while preserving sidecar authority prohibitions and no-fallback rules.
- `synthesis-persistence-performance`: Covers shared-pool contention and ensures
  metrics worker waits do not retain database ownership or block control paths.
- `synthesis-client-foundation`: Keeps the public client contract unchanged while
  production composition supplies the internal sidecar metrics engine adapter.
- `synthesis-layer-doc-system`: Documents the second production compute route,
  shared-pool topology, ownership boundary, and separate prebuild release gate.

## Impact

- Updates the sidecar compute protocol, worker pool, worker, server, internal
  compute client, production composition, and focused Core tests.
- Adds one internal sidecar metrics engine adapter and one production-route test.
- Updates service migration governance, runtime packaging/fingerprint checks,
  Synthesis architecture/performance/packaging docs, README, and Stage 1 progress.
- Adds no dependencies, public endpoints, preferences, UI, persistence, DB
  schema, retry, fallback, or independent metrics worker pool.
