## Why

Citation Graph layout and metrics now prove two production kernels through the
authenticated sidecar worker, but the next graph kernel has a much larger DTO
envelope than the current bounded HTTP wire can safely carry. An isolated
Unified Citation Graph build canary is needed to validate the third kernel and
its cancellation, fault, and packaging behavior without misrepresenting the
current transport as production-scale routing.

## What Changes

- Add the fixed `citation_graph_build.v1` worker operation and authenticated
  `compute.citation_graph_build` capability.
- Execute only wire-bounded, explicitly invoked internal/test canary requests;
  keep production Citation Graph build on the injected in-process engine.
- Reuse the synthesis-engine graph-build request/result rebuilders at every
  trust boundary without copying DTOs or changing engine bounds.
- Share the existing one-active/two-waiting pool, five-second deadline,
  cancellation grace, shutdown budget, resource limits, replacement policy,
  and degraded fuse across layout, metrics, and graph build.
- Replace binary operation assumptions with an explicit closed three-operation
  protocol and exhaustive dispatch; unknown operations remain invalid.
- Add an internal compute-client method without changing public
  `SynthesisClient`, production composition, UI, preferences, or shadow jobs.
- Keep the 8 MiB request/response and 250k/50k compute JSON-node limits. Large
  graph transfer and data layout remain a separate prerequisite change.
- Mark graph build as an in-process production engine with a sidecar canary;
  retain layout and metrics as production workers, `108 methods / 1 direct
  consumer`, and `mutationEnabled: false`.
- Extend build, bundle, XPI, fingerprint, boundary, test, and documentation
  governance without adding dependencies or publishing platform prebuilds.

## Capabilities

### New Capabilities

- `synthesis-citation-graph-build-sidecar-canary`: Defines the authenticated,
  internal-only Unified Citation Graph build canary, strict DTO handling, wire
  eligibility, and unchanged production ownership.

### Modified Capabilities

- `synthesis-citation-graph`: Adds isolated worker parity for the pure build
  kernel while retaining production graph reads, basis checks, promotion, and
  persistence in the plugin.
- `synthesis-sidecar-compute-worker-pool`: Adds graph build as the third fixed
  operation sharing the existing global bounds and failure state.
- `synthesis-sidecar-runtime-foundation`: Advertises and authenticates the graph
  build compute capability with strict request/result rebuilding.
- `synthesis-sidecar-runtime-supervision`: Applies disconnect, cancellation,
  shutdown, and process-tree guarantees to graph-build canary calls.
- `synthesis-sidecar-runtime-packaging`: Includes the graph-build engine module
  and three-operation worker in compiled runtime, XPI, and fingerprints.
- `synthesis-invariant-guardrails`: Records one in-process graph-build canary
  without changing the two production worker routes or sidecar authority.
- `synthesis-persistence-performance`: Covers graph-build serialization,
  cancellation, mixed-operation contention, and responsive control paths.
- `synthesis-layer-doc-system`: Documents the isolated canary, unchanged wire
  limits, and deferred production-scale transfer prerequisite.

## Impact

- Updates sidecar contracts, compute protocol, worker pool, worker, server, and
  internal compute client.
- Adds Core 199 and extends focused engine, worker, wire, supervision,
  packaging, and boundary tests.
- Updates service migration inventory, XPI runtime checks, Synthesis runtime and
  performance docs, README, and Stage 1 progress.
- Adds no dependencies, public APIs, production route, fallback, persistence,
  schema, UI, preference, shadow scheduler, or release prebuild.
