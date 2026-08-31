## Why

Citation Graph currently mutates the live graph topology when a single-source external node is hovered or selected. That interaction-only materialization makes the graph visually noisy, perturbs Sigma layout and camera state, and combines with selection-driven surface rerenders to expose layout-computing feedback after a usable layout is already visible.

## What Changes

- Keep external or unresolved nodes with exactly one distinct visible library source out of every visual projection and layout request, including hover and selection states.
- Preserve those nodes and citation records in Graph data so source-node details and direct detail resolution remain complete.
- Make graph selection and hover presentation-only updates that preserve graph, canvas, control, and layout-region identity.
- Show the in-graph layout banner only when the current graph has no usable coordinates; report later recomputation through the status bar while the last usable graph remains interactive.
- Remove interaction-only neighbor materialization, ranking, and ring placement behavior from WebGL and SVG renderers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-workbench-ui`: Changes single-source external-node visibility, interaction topology, and layout-feedback behavior.
- `synthesis-workbench-graph-command-client-consumer`: Changes incremental graph projection and selection-update behavior while retaining supplemental graph data.

## Impact

The change affects Citation Graph projection helpers, the WebGL and SVG renderers, the typed Synthesis application layout slice, Workbench UI documentation and localization, focused core/UI tests, and generated literature-deep-reading renderer assets. It does not change persisted graph data, public graph query shapes, Host Bridge agent-facing surfaces, or the existing supplemental `hoverOnlyNodes` / `hoverOnlyEdges` transport fields.
