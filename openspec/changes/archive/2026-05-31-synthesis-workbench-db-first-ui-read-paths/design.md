## Context

Synthesis persistence has moved to SQLite-backed runtime state. The Workbench
should therefore treat legacy JSON, canonical projections, and old task rows as
explicit import/export/debug inputs only, never as live UI state. Citation graph
exposes the remaining visible gap: DB rows contain graph structure and metrics,
but Workbench still blocks rendering because layout status is derived from old
projection files or forced to `dirty`.

## Goals / Non-Goals

**Goals:**

- Make Workbench UI snapshot and UI option APIs DB-only for normal reads.
- Store Workbench citation graph layout in DB and refresh it from DB graph rows.
- Automatically refresh layout when entering Graph tab or changing layout
  preset.
- Render DB graph data whenever structure exists, even while layout refresh is
  pending.
- Keep layout separate from citation graph structure and metrics.

**Non-Goals:**

- Do not execute a data migration or import legacy JSON into DB.
- Do not upgrade `literature-digest`.
- Do not make full-library graph layout the initial Workbench graph surface.
- Do not remove explicit import/export/checkpoint/debug file readers.

## Decisions

### Decision 1: Workbench UI hot paths are DB-only

Workbench snapshot assembly, topic options, registry summaries, graph reads,
cleanup rows, and background jobs use repository/runtime DB state. File-backed
canonical/projection readers may remain for explicit import/export/checkpoint
or debug inspection, but their results must not enter normal Workbench UI.

Rationale: fallback readers hide migration bugs, make clean-install debugging
ambiguous, and add expensive filesystem scans to the hot path.

### Decision 2: Citation graph layout is a DB runtime view

The repository stores layout state keyed by bounded view, preset, and graph
hash metadata. The first implementation supports the Workbench overview graph
view and existing presets. The layout payload stores coordinates and diagnostics
as JSON.

Rationale: structure/metrics and layout remain separate, while the UI no longer
depends on legacy projection files to decide whether a graph can be drawn.

### Decision 3: Layout refresh is asynchronous and optimistic

When Graph tab is selected, the host checks the DB snapshot. If graph structure
exists and layout is missing, dirty, failed, or stale, it starts the layout
worker in the background and sends a refreshed snapshot after completion. If an
older layout exists, the UI may render those coordinates while showing a
refreshing state.

Rationale: users should see graph availability immediately and should not need
to manually rebuild layout after structure workers finish.

### Decision 4: Frontend graph readiness is based on structure, not layout

Graph UI shows a true empty state only when there is no DB graph structure. For
non-empty graph data, layout status changes messaging and overlays but does not
block rendering.

Rationale: layout is a presentation cache. Missing layout should not make a
valid graph look absent.

## Risks / Trade-offs

- [Risk] Computing layout on every graph visit could be expensive.
  - Mitigation: layout worker skips when current DB layout is ready unless
    forced, and the graph surface remains bounded.
- [Risk] Old layout coordinates may be visually stale after graph changes.
  - Mitigation: snapshot marks stale/dirty and auto-refreshes.
- [Risk] UI read-path file fallbacks may be scattered.
  - Mitigation: tests construct stale files with empty DB and assert UI stays
    empty/idle.

## Verification Strategy

- Repository schema/API tests for layout state create/read/update/fail/reset.
- Service tests for DB graph snapshot layout states without legacy projection.
- Workbench UI tests for rendering graph data while layout is non-ready.
- Debug worker tests for `citationGraphLayout` before/after state.
- Existing Synthesis UI and update-event tests to guard unrelated read paths.
