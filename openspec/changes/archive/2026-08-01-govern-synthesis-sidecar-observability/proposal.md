## Why

Synthesis sidecar diagnostics currently use one v1 event for two incompatible
purposes. Transport and Rust worker failures are persisted directly in Runtime
Log, while the debug UI retains the same flat events plus a separate mutable
startup snapshot. This produces duplicate incidents, exposes implementation
details in business logs, and makes debug-disabled execution still pay for
stderr parsing, tails, and event construction.

Advanced Matching has exposed the gap because one user operation crosses Host
RPC, Rust dispatch, two worker calls, reverse-Host reads, and durable promotion.
The feature behavior is outside this change; it is an acceptance trace for the
general boundary model.

## What Changes

- Add the strict cross-language `synthesis-sidecar-observation.v2` contract for
  trace context and sanitized span events.
- Split observation into a persistent Host business-audit plane and a
  debug-only in-memory causal trace plane.
- Derive read/mutation policy and semantic terminal classification from the
  production operation manifest.
- Replace the flat event list and startup snapshot with a bounded trace store
  publishing incremental patches every 200 ms.
- Propagate optional trace context across Host RPC and reverse-Host boundaries
  only while the debug capability is enabled.
- Make Rust structured diagnostics debug-only and cover process, RPC,
  reverse-Host, child-worker, transfer, and durable-operation boundaries.
- Render the Dashboard sidecar tab as a stable parent/child trace timeline.
- Extend release-elision and cross-language checks so production proves that
  trace construction, wire context, NDJSON parsing, tails, stores,
  subscriptions, and UI patches are absent.

## Capabilities

### New Capabilities

- `synthesis-sidecar-operation-observability`: Host-owned business lifecycle
  auditing for production operations.

### Modified Capabilities

- `synthesis-sidecar-debug-observability`
- `runtime-log-pipeline`
- `debug-diagnostics-production-isolation`
- `synthesis-sidecar-runtime-supervision`
- `synthesis-sidecar-compute-worker-pool`
- `synthesis-sidecar-service-boundary`
- `synthesis-client-contracts`
- `synthesis-native-worker-transfer-ownership`
- `synthesis-native-reference-canonical-surface`

## Impact

This change affects the shared Synthesis contracts, native client and RPC
composition, runtime supervision, reverse-Host and worker boundaries, Rust
diagnostics, Task Dashboard UI, parity/elision checks, and current-state
Synthesis documentation. It adds no public Host Bridge or MCP API, changes no
stored transcript or Synthesis database format, persists no debug timeline,
and does not authorize prebuild, release, or Gitee synchronization.
