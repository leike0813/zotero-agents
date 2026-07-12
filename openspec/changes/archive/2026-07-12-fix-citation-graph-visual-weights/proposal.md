## Why

Citation graph nodes could appear important despite having no visible connections because the UI discarded formal metrics and reconstructed incoming degree from hidden or hover-only edges. The prior discrete rank mapping also promoted every node in a single positive degree tier to the maximum size.

## What Changes

- Preserve persisted citation metrics when projecting graph nodes to the Workbench UI.
- Centralize Workbench and standalone node-size, fallback-degree, and halo inputs in shared visual rules.
- Base fallback degree only on visible non-hover edges and weight it by `mention_count`.
- Replace discrete degree-tier ranking with a continuous logarithmic size scale.
- Prevent isolated library nodes from receiving PageRank, in-degree, or out-degree contributions in foundation and frontier scores; invalidate prior metric caches.

## Capabilities

### New Capabilities

- `citation-graph-visual-weighting`: Defines consistent citation graph visual importance and isolated-node metric behavior.

### Modified Capabilities

- None.

## Impact

- Affects citation graph metric calculation, cache invalidation, service-to-UI projection, Workbench rendering, and the standalone renderer.
- Does not change database schema, user configuration, or external API endpoints.
