## Context

The SQLite citation table stores one row per raw reference instance so that provenance remains auditable. The Workbench overview currently projects those rows directly, causing repeated references from one paper to inflate external incoming degree and produce parallel layout edges.

The Workbench also treats Sigma as disposable render output. Routine shell and surface updates call `Sigma.kill()`, whose WebGL cleanup explicitly requests `WEBGL_lose_context` for every layer. Container resize currently schedules several additional resize/refresh rounds. Both behaviors are unsafe in Zotero's Gecko host and are independent of graph size or layout completion.

## Goals / Non-Goals

**Goals:**

- Make source-target aggregation and distinct-source degree semantics consistent across canonical and DB-backed graph construction.
- Keep degree-one external targets out of the default graph and layout while preserving hover evidence.
- Give the Graph surface a stable DOM and renderer lifetime and update its model in place.
- Bound resize work and preserve camera and interaction state across routine updates.

**Non-Goals:**

- Replacing Sigma, changing force/radial/components algorithms, adding workers, or imposing graph-size thresholds.
- Changing raw citation storage, SQLite schemas, Host Bridge contracts, or cache file formats.
- Archiving the OpenSpec change or publishing a release.

## Decisions

### Aggregate graph evidence at the read-model boundary

A shared pure aggregator will canonicalize edges by source-target pair, sum mention counts and role evidence, union source references, choose the primary role deterministically, and assign a deterministic pair-derived edge id. Both the canonical graph builder and DB projection will use this rule. The repository retains raw rows as provenance; graph DTOs remain aggregated projections.

External degree will be calculated from the aggregated pairs, equivalently the set of distinct library source ids per external target. Main versus hover-only classification and diagnostics occur after aggregation so layout links and reported counts share the same semantics.

Alternatives rejected: counting raw rows with a separate distinct-degree set would fix node classification but retain parallel layout edges and duplicate aggregation rules.

### Mount the Workbench shell and Graph region once

The Workbench will retain stable shell regions instead of clearing and rebuilding the root for ordinary updates. A persistent Graph region owns one stage and one Sigma renderer for the document lifetime. When another tab is active the Graph region remains mounted but inert, aria-hidden, invisible, and outside normal layout flow; it is not set to `display:none`.

Graph-model changes build a fresh Graphology model and pass it to `Sigma.setGraph()`. Renderer-relevant inputs receive a deterministic signature; selection, search, chrome, drawer, and sidebar state are excluded and update reducers or DOM regions directly. Camera resets only when the layout coordinate basis changes or the user explicitly requests reset.

Alternatives rejected: detaching and reattaching a stage retains references but still exposes Gecko resize and garbage-collection timing; recreating Sigma after each tab change repeats the unsafe WebGL lifecycle.

### Remove plugin-owned WebGL context loss

Routine code paths will not call `Sigma.kill()`. Event reducers and handlers will read live Workbench state or the renderer's current graph so `setGraph()` cannot leave stale closure references. Document teardown will be left to Gecko, which owns final WebGL resource release.

### Coalesce resize work

The custom multi-round RAF and timeout sequence will be replaced with at most one outstanding cancellable animation-frame resize. Resize requests while Graph is inactive are recorded as pending and fulfilled once after activation. The persistent ResizeObserver is created once and disconnected only with document disposal.

## Risks / Trade-offs

- [Persistent hidden canvases consume resources while another tab is active] → Keep exactly one renderer and graph model, make the surface inert, and avoid duplicate observers/timers.
- [Region-level shell synchronization can expose stale DOM state] → Give each region a narrow synchronization function and cover tab, sidebar, selection, and snapshot transitions with identity tests.
- [`setGraph()` can leave handlers referencing old data] → Remove graph/snapshot captures from renderer callbacks and resolve all interaction data from live state.
- [Aggregated edge ids differ from raw DB edge ids] → Treat raw ids only as source references and use deterministic pair ids consistently at the graph DTO boundary.

## Migration Plan

No data migration is required. Existing raw citation rows and stored layouts remain readable; the corrected graph hash/layout basis will mark incompatible cached layout state stale through the existing refresh path. Generated literature-deep-reading renderer assets will be rebuilt from the updated source and CSS.

Rollback consists of reverting the source, generated assets, tests, and change artifacts; no persisted schema downgrade is needed.

## Open Questions

None.
