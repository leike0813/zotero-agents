## Design

### Snapshot Input Boundary

`SynthesisService` exposes a lightweight input facade for Workbench rendering.
The facade returns `SynthesisUiSnapshotInput` and performs only bounded reads.
`getSynthesisSnapshot(state)` becomes a thin wrapper that builds
`SynthesisUiSnapshot` from that input and the provided UI state.

### Workbench Host Cache

The Workbench tab runtime stores the latest `SynthesisUiSnapshotInput`. Initial
load and host commands refresh that cache from the service. Pure UI actions use
the cache with `buildSynthesisUiSnapshot()` and do not call the service.

Pure UI actions include tab selection, filters, graph selection, tag/concept
selection, concept overlay toggles, topic graph mode changes, and review merge
candidate selection.

### Side-Effect-Free Read Path

Workbench snapshot reads do not write job state, artifact state, projection
registry, receipts, events, diagnostics, or canonical assets. Literature job
state is exposed through a read-only peek that combines persisted job state and
projection status without scheduling retry or enqueueing rebuilds.

Explicit job commands keep the existing worker behavior.

### Lightweight Literature/Citation Data

Workbench snapshot data reads Literature Registry and Citation Graph projections
from `state/*.json`. If those are missing or stale, the snapshot exposes bounded
diagnostics and continues to use the latest readable legacy graph projection
where available. It does not scan `citation-graph/*` canonical directories for
Workbench rendering.

### Small Icons

Existing high-resolution PNGs are retained as assets. New 32px copies are added
and become the only small-icon runtime references.
