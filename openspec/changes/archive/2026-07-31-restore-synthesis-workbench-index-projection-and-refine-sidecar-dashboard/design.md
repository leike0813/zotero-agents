## Context

`WorkbenchApplication::read()` correctly exposes operational cache readiness and background jobs. The production compatibility handlers currently return that DTO unchanged for both `client.getSynthesisWorkbenchChromeInput` and every `client.getSynthesisWorkbenchSurfaceInput` call. The plugin casts the response to `SynthesisUiSnapshotInput`, whose Index contract instead requires `registry.cacheStatus` and `registry.rows`.

The Reference Canonical application already owns the Reverse Host library port and repository reference facts. The existing public Reference Sidecar Index, however, starts from cached reference-source rows, so it cannot represent current Zotero items whose sidecars are missing.

## Goals / Non-Goals

**Goals:**

- Make a successful Reference Refresh immediately visible as `ready` with populated Workbench Index rows.
- Keep current Zotero Library items as the Index roster and join only scoped sidecar facts.
- Preserve existing public operation names, pagination, error categories, and database schema.
- Reuse Dashboard status/copy primitives and keep all diagnostic UI behind the existing compile-time gate.

**Non-Goals:**

- Completing unrelated Topic, Review, Graph, Tag, Concept, or Reader native surface projections.
- Changing Reference Refresh execution, cache promotion, Zotero artifact ownership, or production diagnostic retention.
- Adding remote prebuild or release work.

## Decisions

### Share facts, not wire DTOs

The Reference Canonical application will build an internal typed row projection from current Host items plus scoped repository artifacts, active raw references, redirects, and bindings. The public Reference Sidecar Index and Workbench Index will serialize that projection separately so legacy snake-case API fields and Workbench camel-case UI fields remain correct.

### Keep UI reads bounded

Workbench Index will request at most 100 current library rows. Repository reads for artifacts, reference summaries, and expanded references will be restricted to those source refs. Expanded reference details will be loaded only for the bounded `expandedSourceRefs` set already carried by Workbench state.

### Read readiness from cache basis

`registry.cacheStatus` will be projected from `reference-sidecar:library`. Row count will not influence readiness, so a successfully refreshed empty library remains `ready`. Chrome will adapt operational cache/job rows into the existing `maintenance.summary` and `maintenance.backgroundJobs` UI fields.

### Reuse Dashboard primitives

The event table and startup summary will call the existing `renderStatusBadge`. `started` joins the existing accent/busy tone; succeeded and failed retain the shared success/error tones. Detail will contain a compact summary grid followed by the unchanged full `{ selected, related }` JSON payload. Copy will use `copyTextToClipboard`, transient button text, and the existing toast.

## Risks / Trade-offs

- [Reference facts can be large] → Query/count only the displayed source set and load detail rows only for explicitly expanded sources.
- [Two consumers need different field names] → Keep one typed fact projection with two small boundary adapters rather than reusing either public DTO internally.
- [Dashboard rerenders can replace feedback state] → Apply copy feedback directly to the clicked button and toast without adding persistent application state.

## Migration Plan

No data migration is required. The implementation changes read projections only. After focused and full validation, rebuild the pinned-nightly Rust sidecar and update the existing current-platform addon package for local retesting.

## Open Questions

None.
