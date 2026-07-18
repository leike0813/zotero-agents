## Why

The supervised Synthesis sidecar has a responsive authenticated control plane,
but it has not yet proved that bounded domain computation can cross the real
HTTP and worker boundary without compromising Zotero responsiveness or
production data ownership. Citation Graph layout is already an
environment-neutral engine and provides a contained canary for validating that
path before any production routing change.

## What Changes

- Add a service-owned, lazy, single-worker compute pool with a two-request
  waiting bound, hard execution deadlines, bounded cancellation and shutdown,
  worker resource limits, replacement after runtime faults, and a three-fault
  degraded fuse.
- Expose authenticated `compute.citation_graph_layout` through the sidecar
  protocol while retaining health, handshake, and shutdown responsiveness under
  compute saturation.
- Reuse the synthesis-engine Citation Graph layout request/result rebuilders at
  every process boundary and add an internal authenticated compute client.
- Package the worker, synthesis engine, D3 runtime modules, and their licenses;
  include their inputs in the runtime build fingerprint.
- Strengthen migration inventory, service boundary, packaging, lifecycle, and
  documentation checks without routing the production `SynthesisClient` or
  changing database, canonical-file, mutation, or engine ownership.

## Capabilities

### New Capabilities

- `synthesis-sidecar-compute-worker-pool`: Defines bounded sidecar compute,
  Citation Graph layout execution, cancellation, fault isolation, degradation,
  observability, and shutdown behavior.

### Modified Capabilities

- `synthesis-sidecar-runtime-foundation`: Adds compute capability discovery,
  strict compute transport, and O(1) pool snapshots to health and handshake.
- `synthesis-sidecar-runtime-supervision`: Requires all service shutdown paths
  and direct process termination to stop worker threads within a bounded budget.
- `synthesis-sidecar-runtime-packaging`: Carries the worker, engine, D3 runtime,
  licenses, and fingerprint inputs in each product-owned runtime bundle.
- `synthesis-invariant-guardrails`: Allows worker-thread imports only at the
  designated service boundary while preserving production ownership and
  inventory invariants.
- `synthesis-persistence-performance`: Records the bounded worker topology and
  keeps control-plane work independent from compute saturation.
- `synthesis-layer-doc-system`: Documents the compute canary and the unchanged
  production kernel ownership.

## Impact

- New service worker-pool owner, worker entrypoint, and internal compute client.
- Updated sidecar contracts, server routing, lifecycle shutdown, service and
  engine compilation, runtime packaging/release governance, and static boundary
  checks.
- New Core 195 and extensions to Core 168, 183, and 192-194.
- Updated migration inventory and Synthesis runtime, packaging, performance,
  README, and Stage 1 progress documentation.
- No new dependency, UI, preference, database schema, process child, persistent
  task queue, public `SynthesisClient` route, production owner, or prebuild
  publication.
