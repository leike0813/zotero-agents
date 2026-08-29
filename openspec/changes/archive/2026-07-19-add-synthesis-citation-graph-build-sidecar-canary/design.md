## Context

The sidecar currently owns one lazy worker and a two-item memory queue. Citation
Graph layout and metrics use two fixed operations through the same authenticated
HTTP, cancellation, replacement, degraded-fuse, and packaging path. Unified
Citation Graph build is already an environment-neutral engine with strict
request/result rebuilders and cooperative checkpoints, but its production bounds
of 25,000 sources, 1,250,000 references, and 750,000 external targets exceed the
current 8 MiB and 250k/50k JSON-node wire limits.

Production graph rebuild already captures repository facts under the plugin
lock, computes outside the lock, recaptures the basis before promotion, and
retains last-good graph state on failure. This change must not disturb that
ownership while adding a real cross-process graph-build canary.

## Goals / Non-Goals

**Goals:**

- Execute explicitly invoked, wire-bounded graph-build requests through real
  authenticated HTTP and the existing worker.
- Prove direct/worker parity for full and source-slice requests and preserve
  strict DTO validation at every trust boundary.
- Extend one globally bounded pool and failure state to three fixed operations.
- Package and fingerprint the graph-build engine module and keep sidecar
  authority machine-checkable.

**Non-Goals:**

- Routing production graph rebuild, public `SynthesisClient`, Workbench, DB,
  repository, canonical files, Host capabilities, or Zotero globals through the
  canary.
- Increasing wire limits, adding compression, streaming, chunking, persistence,
  retries, fallback, shadow scheduling, diagnostics commands, UI, or preferences.
- Generating, downloading, publishing, or synchronizing runtime prebuilds.

## Decisions

### Add a closed third operation without dynamic loading

`citation_graph_build.v1` is exposed only as
`compute.citation_graph_build`. The compute protocol remains a discriminated
closed union. Server, pool, and worker dispatch become explicit and exhaustive
for layout, metrics, and graph build; any unknown value is invalid.

The HTTP main thread rebuilds the request before enqueue, the worker rebuilds it
before compute, and the main thread rebuilds the result against the admitted
request. The internal client also rebuilds both boundaries. Types and rebuilders
come directly from `packages/synthesis-engine/src/citationGraphBuild`; no DTO or
canary-specific engine limit is copied.

### Keep the canary internal and production graph build in process

The internal compute client gains `computeCitationGraphBuild`, but production
legacy composition continues injecting the in-process graph-build engine. There
is no sidecar graph-build adapter, runtime trigger, automatic shadow call, retry,
or fallback branch. Migration inventory records `sidecar_worker_canary: true`
while retaining `implementation: in_process` and `production_worker: false`.

This keeps graph facts, Host metadata, basis capture/recapture, persistence,
promotion, and last-good retention entirely in the plugin. It also makes canary
failure incapable of changing production graph state.

### Preserve wire bounds as canary eligibility

The existing 8 MiB request/response, 250,000 request JSON-node, 50,000 response
JSON-node, depth, and string limits remain authoritative. Small representative
full and source-slice fixtures may cross the canary. Oversized payloads fail with
existing stable wire errors; the implementation does not split or compress them.

A future change must define bounded chunking/streaming and data layout before
production graph-build routing can be considered. Engine production bounds are
not reduced merely to fit the canary.

### Share the existing global pool and lifecycle policy

All three operations share one active slot, two waiting slots, one worker, the
five-second hard deadline, 100ms cooperative cancellation grace, 500ms shutdown
budget, V8 limits, replacement policy, and three-consecutive-runtime-fault fuse.
Graph build passes its existing checkpoint callback to the worker engine so
active aborts can cooperate before forced termination.

A separate pool was rejected because it would multiply memory and make global
admission unbounded. A longer graph-build deadline was rejected because this is
a transport/process canary, not a production throughput promise.

### Package the dedicated graph-build module explicitly

The worker imports the dedicated compiled graph-build engine module rather than
adding plugin/application dependencies. Runtime assembly already copies the full
compiled service tree and fingerprints the full engine source tree; packaging
and XPI checks additionally require `citationGraphBuild.js` so a stale or
incomplete prebuild fails closed. No third-party runtime package is added.

## Risks / Trade-offs

- [Representative canary succeeds while production-scale DTOs do not fit] →
  Document the wire envelope prominently and keep production routing unchanged.
- [Graph build can occupy the single worker and delay layout/metrics] → Preserve
  the global queue bound, five-second deadline, immediate `worker_busy`, and
  responsive control plane.
- [Graph-build output exceeds response limits after successful compute] → Reject
  serialization with the existing stable response-limit error and never promote
  the canary result.
- [Cancellation checkpoint is too sparse for a particular input] → Retain the
  100ms grace followed by worker termination and replacement.
- [Source changes make checked-in prebuilds stale] → Keep freshness fail-closed
  and regenerate assets only in the separate release pipeline.

## Migration Plan

1. Add failing Core 199 and focused pool/wire/boundary/packaging assertions.
2. Add the capability, closed protocol operation, worker/pool/server dispatch,
   and internal client method.
3. Update inventory, XPI requirements, docs, and Stage 1 progress.
4. Run strict OpenSpec, TypeScript, focused Core, boundary, invariant, lint,
   docs, build, and diff checks. Rollback removes the canary operation and
   capability; no data migration or production behavior rollback is required.

## Open Questions

None. Internal-only invocation, unchanged production composition, unchanged wire
limits, shared pool policy, and separate prebuild publication are fixed.
