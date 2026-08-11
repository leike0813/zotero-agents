## Why

Incremental Citation Graph page merges can clear the Workbench's hover state while Sigma still considers the pointer to be over the same node. The affected node then loses its title and incident edges until the pointer fully leaves and re-enters. Independently paged node and edge streams can also expose external nodes before their complete visible neighborhood is available. Standalone WebGL and SVG fallback entry points must apply the same projection before their first render rather than relying on a later filter action.

## What Changes

- Preserve valid transient hover and hover-label state across same-query Citation Graph page merges and routine snapshot refreshes.
- Keep selection and pointer hover as independent interaction owners whose neighborhoods are rendered as a union.
- Enforce an endpoint-closed display projection in which library nodes may be isolated, one-source external neighborhoods remain hover-only, and default external or unresolved nodes require incoming citations from at least two distinct currently visible library sources.
- Preserve the v0.8.3 interaction-only edge model in every renderer while allowing selected and pointer-hover neighborhoods to remain visible together.
- Apply the shared projection during initial standalone WebGL normalization, subsequent filter and layout changes, and SVG fallback rendering.
- Add behavioral regression coverage for page arrival during hover, distinct-source external-node promotion, initial projection parity, and interaction-only edge visibility.
- Collapse parallel raw citation records into one deterministic visual edge so a simple directed renderer cannot leave interaction nodes half-materialized.
- Bound and place interaction-only neighborhoods in screen-relative rings so they cannot obscure their owning library node.
- Make neighborhood expansion omit absent optional filters and preserve coordinates and continuation-page ownership while slices merge.
- Give the host sole ownership of layout recomputation, deduplicate same-basis operations, and reject stale progress or cross-frame actions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-workbench-graph-command-client-consumer`: Incremental page merges preserve valid graph interaction state and promote external nodes only after their second distinct visible library source arrives.
- `synthesis-workbench-ui`: Citation Graph visibility distinguishes hidden, hover-only, and default external neighborhoods while retaining interaction-only edge presentation in WebGL and SVG renderers.

## Impact

The change affects the Workbench Sigma renderer, the shared Citation Graph display projection used by the UI model and both standalone renderers, graph-window merging, host layout coordination, the deep-reading export envelope partitioning, focused graph tests, and the generated literature-deep-reading renderer bundles. It does not change public APIs, snapshot schemas, Rust repository queries, pagination cursors, dependencies, or persisted graph data.
