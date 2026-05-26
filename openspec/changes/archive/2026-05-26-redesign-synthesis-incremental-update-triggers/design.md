## Context

The Synthesis layer now has canonical stores, JSON/DTO projections, Workbench
views, MCP tools, Host Bridge CLI commands, and Git Sync integration. Some
read paths still treat missing or stale projections as a reason to enqueue
background rebuild work. Because these reads are reachable from UI, MCP, CLI,
and agents, they can start expensive library-wide work without user intent.

This change turns Synthesis maintenance into an event-driven incremental
system. Reads become side-effect free. Durable mutation and observer events
drive dirty scopes. Workers process those scopes under budget. Full rebuilds
remain explicit repair operations.

## Goals / Non-Goals

**Goals:**

- Make Synthesis UI, MCP, CLI, and snapshot read paths free of rebuild side
  effects.
- Introduce a durable update event journal and dirty queue for automatic
  Synthesis work.
- Make Paper Registry the incremental foundation using per-paper facets.
- Split Citation Graph work into structure/lightweight metrics, complex
  metrics, and on-demand layout.
- Update topic freshness from registry changes without rewriting topic
  artifacts or semantic topic graph edges.
- Delay Git Sync until canonical maintenance workers drain and a large debounce
  window has elapsed.

**Non-Goals:**

- No production data migration or migrated test data enrichment.
- No SQLite/FTS/BM25 projection backend replacement.
- No automatic topic synthesis workflow submission or artifact rewriting.
- No semantic topic graph inference outside topic synthesis apply/review.
- No new npm dependencies.

## Decisions

### Read paths are diagnostics-only

Synthesis read methods may return latest usable data, stale/missing
diagnostics, recommended explicit command ids, and process-local hints. They
MUST NOT enqueue jobs, write projection/job state, schedule retries, or scan the
whole library.

Alternative considered: let read paths enqueue "helpful" rebuilds when stale.
Rejected because read surfaces are exposed through UI, MCP, and CLI and would
remain unpredictable for large libraries.

### Events drive automatic work

Automatic maintenance starts from durable events: Zotero item changes, workflow
apply hooks, reference matching apply, topic synthesis apply, and explicit user
commands. Events are coalesced by scope and processed by single workers under
fixed budget.

Alternative considered: keep each domain worker self-scheduling. Rejected
because cross-domain side effects become hard to reason about and hard to pause.

### Startup reconcile is lightweight

Plugin startup may run a lightweight reconcile scan that compares Zotero item
identity and metadata fingerprints against registry facets, records dirty
events, and shows a toast/status notification. It does not parse artifacts,
rebuild registry rows, update graphs, compute metrics, compute layout, or block
Workbench/dashboard rendering.

Alternative considered: run a full registry rebuild at startup. Rejected
because it does not scale and would recreate the current global performance
risk.

### Paper Registry uses facets

Each paper registry row is modeled as stable identity plus small independently
hashed facets: identity, metadata, artifact, reference, readiness, and topic
usage. Downstream workers subscribe to facet changes rather than invalidating a
whole row for every small update.

Alternative considered: keep a monolithic row hash. Rejected because it causes
too much downstream invalidation and prevents precise incremental work.

### Citation Graph is layered

Citation graph structure and lightweight metrics update from affected papers or
works. Complex metrics run as low-priority background work. Layout is
UI-specific and runs only when Graph UI or an explicit command needs a newer
layout; layout refresh also refreshes stale complex metrics required by the UI.

Alternative considered: rebuild graph, metrics, and layout together. Rejected
because layout is comparatively expensive and unnecessary for most reads.

### Topic freshness is not topic rewriting

Paper Registry changes can update topic freshness, coverage, and update
availability. They must not rewrite topic artifacts, submit synthesis
workflows, or change semantic topic graph relations.

Alternative considered: background-refresh topic artifacts from changed papers.
Rejected because that requires a workflow run and user-visible review.

### Git Sync uses canonical mutation epochs

Canonical writes from incremental workers mark a canonical mutation epoch dirty.
Git Sync waits for active canonical maintenance workers to drain, then uses a
large debounce window before autosync. Projection files, job state, and
read-only calls do not trigger sync.

Alternative considered: sync after every canonical write transaction. Rejected
because incremental workers may produce bursts of small canonical writes.

## Risks / Trade-offs

- Read paths may show stale data longer -> UI must clearly show latest usable
  age, stale status, and explicit update commands.
- Event queue bugs can leave stale scopes unprocessed -> startup reconcile and
  manual verify/rebuild remain available.
- Facet modeling increases implementation complexity -> use a small v1 facet
  set and keep full rebuild as repair fallback.
- Complex metrics may lag structure -> metrics DTOs must expose freshness and
  latest usable status.
- Large debounce delays Git Sync freshness -> manual sync remains available with
  pending-worker warnings.

## Migration Plan

This change has no production data migration. Existing projection files remain
latest usable data until replaced by incremental workers or explicit rebuilds.
Full rebuild commands remain available as recovery paths.

Implementation should proceed in phases: first remove read-path enqueue, then
add the event journal, then add incremental workers and domain-specific
freshness behavior. Each phase must preserve existing bounded read DTOs.

## Open Questions

- Whether citation layout recompute should cancel when the user leaves Graph
  view or continue because the result is reusable.
- Which metadata fields form the startup reconcile fingerprint in v1.
- Which complex metrics are required for v1 and which may remain partial/stale
  until graph use.
- Exact thresholds for topic coverage/freshness recommendations such as
  `update_patch` versus `update_full`.
