## Context

See `proposal.md` for motivation. The native Rust graph read and layout paths already exclude single-source external nodes from the default layout projection. The browser subsequently reintroduces those rows into the live Graphology graph during hover and selection, while the typed TypeScript application layout slice does not consistently apply the native projection. Selection-only host responses also pass through the full graph-surface render path because selection participates in the broad content signature.

The existing `hoverOnlyNodes` and `hoverOnlyEdges` fields cross native, service, Host Bridge, and generated-renderer boundaries. They remain useful supplemental data for details, so changing that wire shape would add unrelated migration risk and touch governed Host Bridge surfaces.

## Goals / Non-Goals

**Goals:**

- Keep the live visual graph topology identical across hover and selection.
- Use one distinct-source rule for both TypeScript and native layout inputs.
- Isolate graph interaction updates from canvas, controls, and layout feedback.
- Retain hidden citation targets and raw evidence for details.

**Non-Goals:**

- Rename supplemental transport fields or change persisted graph records.
- Change the two-source promotion threshold, layout algorithms, graph paging limits, or Host Bridge agent-facing instructions.
- Suppress non-blocking command progress or layout failures.

## Decisions

### Keep supplemental rows data-only

`projectCitationGraphVisibility` continues to return the existing default and supplemental partitions, but only `defaultNodes` and `defaultEdges` feed WebGL/SVG topology. Details continue to resolve against the union. This avoids duplicating visibility rules and avoids a broad wire migration.

Alternative considered: rename or remove `hoverOnly*` fields. Rejected because the fields cross governed surfaces and still carry required detail data.

### Remove topology mutation from graph interaction

Pointer hover and selection update reducer inputs, incident-edge emphasis, labels, and drawers only. Interaction-neighbor ranking, the 100-node cap, dynamic Graphology insertion/removal, and screen-relative ring placement are removed. Default nodes that lack coordinates during page merge retain a generic deterministic fallback position unrelated to interaction.

Alternative considered: keep dynamic rows but exclude them from camera bounds. Rejected because it retains mutable topology and two competing projection modes.

### Classify selection-only graph updates in the browser

The browser maintains a graph-content signature that excludes `selectedElement` and a separate interaction signature. When an incoming graph surface has unchanged content, the renderer updates state, reducers, details, and selection presentation without invoking the full graph render path. Page merges continue through their existing targeted update path.

Alternative considered: add a new host/browser message type for selection. Rejected because the client can classify the existing complete snapshot without expanding the message contract.

### Gate the in-graph layout banner on coordinate usability

The banner is rendered only when no default-visible node has finite coordinates and the layout is genuinely pending or refreshing. When usable coordinates exist, the graph remains mounted and layout progress stays in the existing status path. Failure diagnostics remain visible through their current non-blocking treatment.

### Share the default layout projection in the typed application

The typed application layout slice delegates to the existing citation graph projection module before invoking layout compute. This aligns TypeScript with the already-correct native implementation and keeps the distinct-source rule in one application-layer helper.

## Risks / Trade-offs

- [Risk] A hidden single-source target cannot be opened by clicking its graph node because that node no longer exists visually. → Keep its metadata and evidence in the visible source node's details, and continue resolving an externally supplied hidden selection when data is loaded.
- [Risk] Selection fast-path classification could miss a graph-content field. → Define the signature from every canvas-affecting projection, coordinate, style, query, and layout-basis field, and cover DOM identity plus topology identity in UI tests.
- [Risk] Generated standalone assets drift from source. → Regenerate through the repository renderer and compare source/builtin template directories byte-for-byte.

## Migration Plan

No data migration is required. Update tests, source renderers, typed layout projection, documentation, localization, and generated assets in one change. Rollback consists of reverting this change; persisted graph data and public transport shapes remain unchanged.
