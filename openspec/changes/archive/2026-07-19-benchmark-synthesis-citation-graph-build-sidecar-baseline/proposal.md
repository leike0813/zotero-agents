## Why

The authenticated Citation Graph build canary proves semantic parity only for
small wire-bounded requests. Representative graph DTOs already exceed the
current HTTP JSON-node and response-byte limits, while serialization,
structured clone, repeated strict result rebuilding, worker memory, and
control-plane responsiveness have no reproducible cross-process baseline. A
measurement change is required before choosing or routing a production-scale
transfer contract.

## What Changes

- Add a deterministic Citation Graph build benchmark matrix and one fixture
  source shared by the existing direct-engine budget and the new sidecar
  baseline.
- Add Core 200 as a stable CI gate for fixture determinism, request/result byte
  and JSON-node classification, small authenticated HTTP/worker parity, and
  unchanged production ownership.
- Add an explicit benchmark command for isolated normal, target, and stress
  sampling without putting machine-dependent timing or memory thresholds in
  ordinary CI.
- Measure request/result envelopes, rebuild/serialization/parse phases, direct
  compute, worker round trips, CPU, RSS/heap, event-loop responsiveness, and
  cancellation latency without changing the production compute protocol.
- Capture a versioned human-readable baseline and update runtime, performance,
  README, and Stage 1 progress documentation.
- Keep the current monolithic JSON path internal-only. Do not add chunking,
  streaming, staging, binary DTOs, persistence, or production graph-build
  routing in this change.

## Capabilities

### New Capabilities

- `synthesis-citation-graph-build-sidecar-baseline`: Defines the deterministic
  cross-process benchmark matrix, stable CI classifications, opt-in scale
  sampling, and evidence required before a large-transfer design.

### Modified Capabilities

- `synthesis-citation-graph-build-sidecar-canary`: Records representative wire
  ineligibility while retaining the small internal canary and in-process
  production route.
- `synthesis-persistence-performance`: Adds reproducible payload,
  serialization, worker, memory, event-loop, and cancellation measurements
  without turning host-dependent values into CI budgets.
- `synthesis-invariant-guardrails`: Requires the benchmark to add no runtime
  authority, public client route, method inventory, or mutation drift.
- `synthesis-layer-doc-system`: Documents the captured baseline, commands,
  interpretation, and deferred large-transfer prerequisite.

## Impact

- Adds benchmark-only fixtures, CLI support, Core 200, and a dated report.
- Reuses the new fixture SSOT from Core 150 instead of retaining duplicate graph
  request construction.
- Updates package scripts and Synthesis runtime/performance/status documents.
- Adds no dependencies, production API or protocol changes, runtime bundle
  files, prebuilds, persistence, schema, UI, preference, fallback, or release
  action.
