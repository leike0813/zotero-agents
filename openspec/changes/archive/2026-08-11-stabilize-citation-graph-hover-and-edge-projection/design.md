## Context

See `proposal.md` for motivation. Citation Graph nodes and edges are merged incrementally into a persistent Graphology/Sigma instance. The application owns reducer inputs such as the active hover node, while Sigma separately tracks the pointer target that caused `enterNode`; clearing only the application state during a page merge leaves those states inconsistent. The UI model and standalone renderer also implement parallel filtering paths over independently paged node and edge streams.

## Goals / Non-Goals

**Goals:**

- Keep transient hover presentation stable across routine and same-query incremental merges.
- Make the hidden, hover-only, and default external-node tiers one shared, filter-sensitive projection rule.
- Preserve the persistent WebGL renderer and the v0.8.3 interaction-only edge presentation in both WebGL and SVG renderers.

**Non-Goals:**

- Changing repository queries, graph storage, pagination cursors, snapshot schemas, or Sigma internals.
- Making every edge permanently visible or changing graph layout behavior.

## Decisions

### Reconcile application interaction state at merge boundaries

Replace selection-as-hover synchronization with a reconciliation operation that receives whether the graph basis is being preserved. Selection comes from the snapshot, while pointer hover is transient renderer state. Same-query page merges and unchanged-model refreshes retain a valid pointer target; a new query or graph basis clears only that transient target. Dynamic hover-only nodes and edges are rebuilt from the union of both owners after reconciliation so they never become the source of truth.

This keeps state ownership inside the Workbench instead of reaching into Sigma's private pointer state. Recreating Sigma was rejected because it would violate the established canvas, context, camera, and managed-region identity contract.

### Project external visibility from distinct visible library sources

Use one shared Citation Graph projection operation for the UI model and standalone filtering path. It applies topic, node-kind, low-signal, and role filters before counting distinct visible library sources for each external or unresolved target. Zero-source targets are omitted, one-source targets and their qualifying edges become hover-only, and targets with at least two sources enter the default projection with endpoint-closed qualifying edges. Multiple evidence edges or mentions from the same library node count once.

The shared operation returns default and hover-only partitions so filtered shared nodes can demote without losing their inspectable source data. Optional transport metadata such as `external_degree`, `display_tier`, and `visibility` remains descriptive and can accelerate diagnosis, but it is not the correctness source for the current visible projection. Library nodes remain in the default projection even when isolated.

### Keep every edge interaction-scoped

The Sigma edge reducer hides every edge at rest. Edges incident to either the selected node or the pointer-hovered node are visible together, and explicit edge selection keeps that edge visible. Pointer hover takes precedence only when choosing the direction color for an edge incident to both owners. Default external admission controls which nodes and topology are mounted; it does not create a second edge-visibility policy.

Node dimming and dynamic one-source materialization use the same owner set. Pointer hover always enables the hovered node's title renderer, including nodes that also draw an importance halo. Selection continues to own the detail drawer and never suppresses the pointer target's title.

The SVG fallback applies the same projection before drawing. At rest it draws default nodes and no edges. While a node is active, it draws only incident default edges and temporarily materializes eligible one-source external neighbors with their qualifying edges. Full model data remains available to the export envelope and drawer paths.

### Project standalone data before the first render

Standalone WebGL normalization performs the shared projection for the initial envelope and every stored layout. Filter and layout changes call that same normalization path with the next filters. This makes the first frame equivalent to applying the current filters again and removes the parallel standalone filter implementation.

The Python deep-reading envelope keeps complete `nodes` and `edges`, but partitions transport metadata into `visible*` and `hoverOnly*` arrays from the model's existing visibility annotations. JavaScript remains responsible for the filter-sensitive distinct-source projection.

### Test rendered behavior without a production debug surface

The WebGL lifecycle test will build a temporary instrumented entry that exposes the Sigma instance only inside the test artifact. It will emit the public `enterNode` event, inspect public node and edge display data, deliver a graph page, and verify the presentation remains stable. Production code receives no test API.

### Aggregate visual topology before rendering

After active filters and distinct-source projection, group raw edges by directed endpoint pair. Use the lexicographically smallest raw edge ID as the stable representative and sum normalized mention counts. WebGL, dynamic interaction materialization, and SVG fallback consume this topology; raw rows remain available to details and export paths. This preserves evidence without requiring a multi graph or drawing indistinguishable parallel lines.

Materialize at most 100 interaction-only neighbors per owner, ranked by aggregate mention count, title, and representative edge ID. Place them in deterministic screen-relative concentric rings around the owner. Library/base nodes retain higher picking priority.

### Make layout coordination and graph request ownership explicit

The host is the sole layout mutation owner. A `(graphHash, algorithm)` singleflight covers automatic and manual requests; ready layouts are read, refreshing layouts are observed, and busy races converge through observation without becoming user-facing failures. Monotonic chrome/progress read revisions prevent late Running snapshots from replacing terminal state. Fallback bridge messages are accepted only from the runtime's exact frame window.

Presentation-only graph publications reuse the current service request owner. Only service reads that change the query or basis increment graph generation. Slice merges field-merge nodes so absent coordinates cannot erase known layout data.

## Risks / Trade-offs

- **A role, topic, node-kind, or low-signal filter leaves one qualifying visible library source** → the external neighborhood demotes to hover-only; with no source it is omitted.
- **A high-degree external node contributes many default edges** → the edges remain mounted topology but are drawn only for hover or selection.
- **A hovered node disappears in a later page snapshot** → reconciliation clears it rather than preserving a stale identifier.
- **Generated standalone renderer drifts from the canonical source** → regenerate the source template and copy identical bytes to the built-in materialization, then compare them in validation.
- **A node has many private neighbors** → stable ranking and the per-owner cap keep DOM/WebGL work bounded while details report the loaded total.
- **A stale progress read resolves late** → its revision is discarded before it can merge or publish chrome.

## Migration Plan

No data or API migration is required. Deploy the renderer and projection changes together with regenerated literature-deep-reading bundles. Rollback consists of reverting this change; persisted Citation Graph data remains compatible.
