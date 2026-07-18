## Why

The authenticated Citation Graph Build transfer can stage inputs and outputs larger than one compute envelope, but it still does not execute the worker and currently retains uploaded row objects in service memory. The next step is a bounded streaming worker path that proves the normal-scale build without exposing staging files to the worker or changing production ownership.

## What Changes

- Add an asynchronous authenticated `execute` action to the existing `compute.citation_graph_build_transfer` session protocol, with observable queued/executing/publication states and structured attempt failures.
- Replace retained transfer row objects with metadata-only staging and stream strictly rebuilt canonical pages from the service main thread to the existing worker through one-page-at-a-time transferable buffers.
- Add one environment-neutral packed Citation Graph Build kernel shared by the direct object adapter and the streaming worker adapter, with bounded paged output and no duplicated graph semantics.
- Publish worker output through attempt-scoped staging and atomic manifest commit; failed, canceled, timed-out, crashed, or invalid attempts preserve sealed input and never expose partial output.
- Reuse the existing one-active/two-waiting worker pool and fuse, while giving transfer execution a 30-second hard deadline and retaining five seconds for layout, metrics, and monolithic graph-build calls.
- Make the normal 2,000-source/100,000-reference profile a hard worker canary and retain target/stress as report-only evidence.
- Keep production Citation Graph Build, Host capture, durable basis, database/canonical-file ownership, promotion, and last-good state in plugin composition.

## Capabilities

### New Capabilities

- `synthesis-citation-graph-build-packed-worker-canary`: Defines the authenticated staged-input execution path, packed worker data plane, atomic paged result publication, retry semantics, and normal-scale acceptance.

### Modified Capabilities

- `synthesis-citation-graph-build-large-transfer-contract`: Adds asynchronous execution and attempt status to sealed transfer sessions while preserving the existing HTTP page format and bounds.
- `synthesis-citation-graph-build-sidecar-canary`: Adds a normal-scale streaming worker canary without changing production routing.
- `synthesis-sidecar-compute-worker-pool`: Adds the streaming graph-build operation to the shared queue, cancellation, deadline, replacement, and degraded-fuse behavior.
- `synthesis-sidecar-runtime-foundation`: Dispatches and authenticates execution while keeping health, handshake, and status responsive.
- `synthesis-sidecar-runtime-supervision`: Cancels queued/active transfer attempts and retires staging on every service stop path.
- `synthesis-sidecar-runtime-packaging`: Includes the packed engine and streaming executor/protocol in bundle and fingerprint coverage.
- `synthesis-persistence-performance`: Establishes one-page-in-flight memory behavior, the 30-second transfer deadline, and normal-scale acceptance.
- `synthesis-invariant-guardrails`: Preserves worker dependency restrictions, production ownership, engine inventory, service inventory, and mutation state.
- `synthesis-layer-doc-system`: Documents the streaming canary and the still-separate production cutover.

## Impact

The change affects Synthesis transfer contracts and the graph-build engine, the Node-only transfer owner/executor and worker protocol, the internal transfer client, Core worker/transfer/runtime/packaging suites plus a new Core 202 suite, benchmark reporting, migration inventory, and Synthesis runtime documentation. It adds no dependency, schema migration, UI, public `SynthesisClient` route, production fallback, prebuilt runtime publication, or service data authority.
