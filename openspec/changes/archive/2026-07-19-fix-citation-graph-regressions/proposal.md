## Why

Citation Graph currently promotes an external paper after repeated references from a single library paper because the SQLite projection counts raw reference rows instead of distinct incoming sources. Separately, routine Workbench UI changes destroy the active Sigma renderer and explicitly lose its WebGL contexts, which can terminate Zotero on the next interaction even after layout and rendering have completed.

## What Changes

- Aggregate Citation Graph edges by source-target pair while retaining raw reference provenance and accumulated mention/role evidence.
- Define external incoming degree as the number of distinct library source nodes, and keep degree-one external nodes out of the default graph and layout.
- Keep the Workbench Graph region, Sigma renderer, canvas layers, and WebGL contexts stable across sidebar, selection, snapshot, resize, and tab updates.
- Update graph models in place with `setGraph()` and coalesce renderer resize work instead of destroying and recreating contexts.
- Extend core and browser regression coverage and synchronize the embedded literature-deep-reading renderer.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `synthesis-citation-graph`: Clarify source-target edge aggregation, distinct-source external degree, and exclusion of degree-one external nodes from the default layout graph.
- `plugin-ui-rendering-stability`: Require persistent graph/canvas renderer identity and bounded resize work across routine UI updates.

## Impact

- Affects Citation Graph projection and diagnostics in the Synthesis service, Workbench shell/surface rendering, Sigma event and resize lifecycle, related tests, engineering documentation, and generated literature-deep-reading renderer assets.
- Does not change the SQLite schema, Host Bridge or external API contracts, persisted raw citation provenance, Sigma dependency version, or layout algorithms.
