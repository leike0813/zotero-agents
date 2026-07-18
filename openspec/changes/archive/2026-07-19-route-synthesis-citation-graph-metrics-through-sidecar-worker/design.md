## Context

The sidecar owns a lazy, single-worker compute pool with a two-item waiting
queue, strict transport bounds, lifecycle cancellation, worker replacement, and
a degraded fuse. Production Citation Graph layout already uses that path, while
metrics still uses the in-process engine injected into legacy composition.

Metrics is a pure engine operation over a strict request DTO. The plugin already
captures graph state before compute, recaptures it before promotion, and retains
the previous metrics on failure, so moving only the kernel does not transfer DB,
canonical-file, or promotion authority.

## Goals / Non-Goals

**Goals:**

- Execute production Citation Graph metrics through authenticated sidecar HTTP
  and the existing bounded worker pool.
- Prove that layout and metrics share admission, cancellation, replacement,
  degraded-state, health, shutdown, and packaging behavior.
- Preserve one DTO source of truth and one compute-client transport path.
- Preserve graph-basis promotion and previous-result retention in the plugin.

**Non-Goals:**

- Routing the other six engines, public `SynthesisClient`, DB, repository,
  canonical files, Host capabilities, or Zotero globals into the service.
- Adding retry, fallback, persistent jobs, SSE, UI, preferences, dependencies, or
  a second worker pool.
- Generating, downloading, publishing, or synchronizing platform prebuilds.

## Decisions

### Use one discriminated compute protocol

`computeProtocol.ts` will define a closed union keyed by
`citation_graph_layout.v1` and `citation_graph_metrics.v1`. Each operation binds
its own request and result types, so the pool and worker can share scheduling
without weakening type or runtime validation. Unknown operations remain invalid.

The service main thread rebuilds the request before enqueueing, the worker
rebuilds it before execution, and the main thread rebuilds the returned result.
All rebuilders come from `packages/synthesis-engine`.

### Share the existing global pool

Layout and metrics share one active slot, two waiting slots, the five-second hard
deadline, 100ms cooperative cancellation grace, 500ms shutdown budget, resource
limits, replacement policy, and failure/degraded counters. This preserves the
bounded-memory contract and tests cross-operation contention. A separate metrics
pool would double resources and leave global admission unbounded.

### Factor one internal HTTP call implementation

The internal compute client will keep operation-specific public methods but use
one private authenticated call helper for serialization limits, deadline and
AbortSignal composition, response limits, request/runtime identity, stable error
mapping, and result rebuilding. This avoids parallel layout and metrics transport
implementations.

### Route only the production metrics engine

A sidecar-backed `SynthesisCitationGraphMetricsEngine` adapter resolves a fresh
ready supervisor connection for every compute call and uses the fixed five-second
deadline. Legacy production composition injects this adapter and its lifecycle
AbortSignal. The in-process metrics adapter remains available for direct engine
tests and explicit non-production compositions but is not a production fallback.

The plugin continues to read graph state, capture and recapture graph hashes and
bases, promote valid results, retain old metrics on failure, and own DB and
canonical files. No DB lock spans the HTTP/worker wait.

### Keep release assets separate

Source runtime fingerprints and bundle/XPI allowlists already collect the service
and synthesis-engine trees. Tests will prove the multi-operation worker and
metrics engine remain covered. Platform prebuild freshness continues to fail
closed until the release workflow regenerates matching assets.

## Risks / Trade-offs

- Shared-pool contention can delay layout behind metrics or metrics behind
  layout. → Preserve the global queue bound and immediate `worker_busy` response.
- A metrics runtime fault contributes to the same degraded fuse as layout. → Keep
  control-plane health and shutdown responsive and require service restart for
  recovery, matching the current pool contract.
- Worker transport adds latency to a previously local kernel. → Retain the
  five-second hard deadline and add bounded route-overhead coverage.
- A stale runtime could reply after supervisor restart. → Resolve a fresh
  connection per call and validate request and service instance identities before
  rebuilding or promoting results.

## Migration Plan

1. Add failing route, parity, shared-pool, boundary, and packaging tests.
2. Add the capability and closed protocol union, then implement worker dispatch.
3. Refactor the internal client and add the sidecar metrics engine adapter.
4. Switch production composition and update inventory, invariants, and docs.
5. Run strict OpenSpec and source verification. Rollback is the source revert;
   there is no data migration or compatibility state.

## Open Questions

None. Production routing, shared limits, fail-closed behavior, and separate
prebuild publication are fixed for this change.
