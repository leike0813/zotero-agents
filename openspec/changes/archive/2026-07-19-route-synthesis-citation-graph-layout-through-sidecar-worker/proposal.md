## Why

The sidecar compute canary now has bounded transport, worker, lifecycle, and
packaging guarantees, but production Citation Graph layout still bypasses that
path through the plugin's in-process composition. Routing this first pure kernel
through the authenticated sidecar proves the production boundary while keeping
database and canonical-file authority inside the plugin.

## What Changes

- Route production Citation Graph layout computation through the authenticated
  sidecar worker without changing the public `SynthesisClient` graph API.
- Fail closed when the supervisor is not ready, the runtime identity changes,
  transport fails, or the worker rejects/fails the task; do not wait, retry, or
  fall back to the in-process engine.
- Preserve plugin ownership of graph reads, basis checks, result promotion,
  canonical files, diagnostics, and failure retention of the previous layout.
- Keep the existing pre-dispatch soft budget and apply the sidecar's fixed
  five-second hard compute deadline with lifecycle cancellation.
- Harden the internal compute client with request/runtime identity checks and
  stable cancellation, timeout, unavailable, and invalid-result errors.
- Mark only Citation Graph layout as a production sidecar worker route; keep the
  other seven engines in process and retain `108 methods / 1 direct consumer`
  and `mutationEnabled: false`.
- Update source bundle, fingerprint, freshness, and XPI governance while leaving
  five-platform prebuild generation and publication to the release workflow.

## Capabilities

### New Capabilities

- `synthesis-citation-graph-layout-production-routing`: Defines the single
  production layout-compute route, fail-closed readiness and runtime identity
  policy, cancellation/deadline behavior, and unchanged plugin data authority.

### Modified Capabilities

- `synthesis-citation-graph`: Moves only the pure layout computation across the
  sidecar boundary while retaining graph-basis validation and promotion locally.
- `synthesis-sidecar-compute-worker-pool`: Promotes the layout operation from a
  canary to the sole production worker kernel without changing pool bounds.
- `synthesis-sidecar-runtime-foundation`: Requires production compute calls to
  use authenticated discovery identity and strict request/result validation.
- `synthesis-sidecar-runtime-supervision`: Defines fail-closed ready-connection
  lookup, restart identity invalidation, and lifecycle cancellation behavior.
- `synthesis-sidecar-runtime-packaging`: Makes the current worker/engine runtime
  fingerprint a production release prerequisite.
- `synthesis-invariant-guardrails`: Allows exactly one production worker route
  while continuing to prohibit sidecar database, canonical, Host, and Zotero
  authority and automatic local fallback.
- `synthesis-persistence-performance`: Covers bounded route overhead and ensures
  network/worker waits do not hold database ownership or block control paths.
- `synthesis-client-foundation`: Keeps the public client contract unchanged
  while production composition supplies the internal sidecar engine adapter.
- `synthesis-layer-doc-system`: Documents the production compute topology,
  ownership boundary, no-fallback policy, and separate prebuild release gate.

## Impact

- Updates the Citation Graph engine adapter, internal compute client, production
  legacy composition, supervisor connection projection, and focused Core tests.
- Updates service migration governance, runtime packaging/fingerprint checks,
  Synthesis architecture/performance/packaging docs, README, and Stage 1 progress.
- Adds no dependencies, protocol endpoints, preferences, UI, persistence, or DB
  schema and does not route the other seven engines through the sidecar.
