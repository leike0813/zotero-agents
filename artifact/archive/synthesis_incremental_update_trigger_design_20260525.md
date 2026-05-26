# Synthesis Layer Incremental Update and Trigger Redesign

Date: 2026-05-25

Status: discussion artifact

## Purpose

This document captures the proposed redesign direction for Synthesis Layer
automatic rebuild and update behavior. It is intentionally a discussion
artifact, not an implementation spec. The goal is to stabilize the architecture
before splitting the work into OpenSpec changes.

The core concern is scale. A Zotero library may grow to tens of thousands of
items, and the Synthesis canonical store may accumulate many topics, concepts,
papers, references, and projections. In that environment, implicit full rebuilds
from read paths, UI interactions, MCP tools, or CLI commands are not acceptable.

The target direction is:

- read paths are side-effect free;
- durable mutation/events drive update work;
- Paper Registry becomes the incremental foundation;
- Citation Graph separates structure/metrics from UI layout;
- Topic Graph semantic updates remain explicit, while topic freshness can track
  registry changes;
- background work is observable, bounded, cancellable or pausable, and retryable.

## Accepted Discussion Decisions

The following decisions were accepted during follow-up discussion and should be
treated as the current baseline for future OpenSpec changes:

- Zotero item changes should automatically record dirty events, but background
  workers must process them within explicit budget and idle constraints.
- First-time full-library initialization remains explicit. Plugin startup may
  run a lightweight reconcile scan, but it must not perform a full rebuild.
- Paper Registry should be modeled as stable identity plus small facets, not as
  one monolithic row.
- Lightweight citation graph metrics should update with structure updates.
  Complex metrics should be updated by an automatic low-priority background job,
  and graph layout refresh should also refresh stale complex metrics before or
  during layout work.
- A manual verify/rebuild/retry entry point must remain available.
- Plugin startup should run a lightweight full-library reconcile scan and show a
  toast/status notification.
- Read paths may record memory-only hints, but hints must not write durable
  state or start workers by themselves.
- Canonical record updates should trigger Git Sync, but Git Sync should wait for
  active canonical update workers to drain and use a large debounce window.
- Topic freshness affects UI prompts and update workflow availability only. It
  must never rewrite topic artifacts or semantic topic graph relations in the
  background.

## Problem Statement

The current implementation has already moved away from some heavy snapshot
read-path behavior, but the system still contains a dangerous pattern:

- a read method may discover missing or stale projection state;
- the read method may enqueue background rebuild work;
- the caller may be UI, MCP, Host Bridge CLI, or an agent workflow;
- therefore a seemingly harmless read can trigger a global background action.

This is especially risky for `getPaperRegistry()`, because it is exposed through
Host Bridge and MCP and can be called by CLI, agents, or diagnostic tools.

If that pattern remains, large-library performance will become unpredictable.
Users will not understand why Zotero becomes busy, and future changes may
accidentally reintroduce global work into dashboard, workbench, or agent read
paths.

## Design Principles

### 1. Read Paths Must Not Trigger Rebuilds

Read paths may report freshness, missing projection, stale state, or suggested
actions. They must not enqueue, start, or retry rebuild jobs.

Examples of read paths:

- `getPaperRegistry()`
- `getCitationGraphSlice()`
- `getCitationGraphMetrics()`
- `queryCitationGraph()`
- Workbench snapshot reads
- MCP read-only tools
- Host Bridge CLI read commands

Allowed behavior:

- return latest usable projection;
- return bounded best-effort rows;
- return diagnostics such as `missing`, `stale`, or `layout_stale`;
- expose explicit commands that the caller may invoke.

Disallowed behavior:

- full registry rebuild;
- citation graph rebuild;
- layout recomputation;
- implicit background queue enqueue;
- projection writes.

### 2. Automatic Work Must Be Event Driven

Automatic update work should be caused by durable events, not by reads.

Valid event sources include:

- Zotero item added, updated, moved, or deleted;
- literature digest apply;
- reference matching or citation analysis apply;
- topic synthesis apply;
- tag/concept/topic graph review actions;
- explicit user commands such as rebuild, retry, or recompute layout.

Each event should have a clear source, scope, and observable job state.

The automatic policy is:

- observers and apply hooks record scoped dirty events immediately;
- workers consume dirty events under budget;
- paused state records dirty events but does not run workers;
- first-time initialization is explicit;
- startup reconcile is lightweight and only creates dirty events;
- read paths may record memory-only hints only.

### 3. Full Rebuild Is a Recovery Path

Full rebuild is still necessary for repair, migration, corruption recovery, or
operator-initiated refresh. It must not be the normal way to keep the system
fresh.

Full rebuild should be:

- explicit;
- visible in UI/job state;
- pausable or cancellable where possible;
- rate-limited;
- resumable or retryable;
- diagnostic-rich.

### 4. Incremental Updates Must Be Bounded

Every automatic update should have a bounded scope:

- one paper;
- one Zotero item;
- one digest output;
- one topic;
- one reference resolution group;
- one affected citation subgraph;
- one dirty batch with an explicit size limit.

When the affected scope cannot be determined, the system should mark a broader
scope stale and ask for explicit rebuild rather than silently running a global
scan.

### 5. Startup Reconcile Is Not Full Rebuild

Plugin startup should run a lightweight reconcile scan to compensate for missed
Zotero observer events. This scan compares Zotero item identity and metadata
fingerprints against known registry state, records dirty events for differences,
and displays a toast/status notification.

It must not:

- parse digest or reference artifacts;
- rebuild Paper Registry rows inline;
- rebuild Citation Graph structure;
- compute graph metrics;
- compute graph layout;
- block startup on large-library processing.

## Proposed Architecture

## Event and Job Model

Introduce a unified Synthesis update event journal and job queue.

```text
Zotero item change
literature-digest apply
reference matching apply
topic synthesis apply
manual command
        |
        v
SynthesisUpdateEvent
        |
        v
dirty scope journal
        |
        +-- paper-registry incremental worker
        +-- citation-graph structure worker
        +-- citation-layout worker
        +-- topic freshness worker
```

Event records should live in the durable state database, not in runtime-only
files.

Suggested event fields:

- `event_id`
- `event_type`
- `source`
- `scope_kind`
- `scope_ref`
- `source_hash`
- `created_at`
- `status`
- `attempt`
- `next_retry_at`
- `diagnostics`

Suggested scope kinds:

- `library`
- `zotero_item`
- `paper`
- `work`
- `reference_instance`
- `topic`
- `citation_graph_structure`
- `citation_graph_layout`

Suggested event types:

- `zotero_item_added`
- `zotero_item_updated`
- `zotero_item_deleted`
- `paper_artifact_changed`
- `digest_applied`
- `reference_matching_applied`
- `topic_synthesis_applied`
- `manual_registry_rebuild_requested`
- `manual_citation_graph_rebuild_requested`
- `manual_layout_recompute_requested`
- `startup_reconcile_requested`
- `startup_reconcile_detected_dirty_items`

## Automatic Policy and Startup Reconcile

### Runtime Policy

Automatic work is split into two stages:

1. Record the fact that something changed.
2. Process changed scopes under worker budget.

This means an observer or apply hook may run immediately, but it should only
append/coalesce dirty events. Actual registry, graph, metrics, layout, and sync
work should be handled by background workers.

### Startup Reconcile

Startup reconcile is the compensation mechanism for missed observer events.

Trigger:

- plugin startup after persistence root is available.

Expected work:

- enumerate Zotero regular items;
- compare item key/library id and lightweight metadata fingerprint against
  existing Paper Registry identity/metadata facets;
- create dirty events for missing, changed, deleted, or restored items;
- report count and state through toast/status diagnostics.

User-visible states:

- `checking`: startup reconcile is scanning lightweight fingerprints;
- `queued`: dirty events were found and queued;
- `ready`: no dirty items were found;
- `failed_retryable`: reconcile could not complete but may be retried;
- `failed_permanent`: reconcile cannot run due to configuration/runtime error.

Boundaries:

- do not run full registry rebuild;
- do not parse large artifact files;
- do not update citation graph directly;
- do not run Git Sync directly;
- do not block Workbench or dashboard rendering.

## Paper Registry Incremental Maintenance

Paper Registry is the foundation. Citation Graph, topic freshness, artifact
readiness, and synthesis workflow inputs should all benefit from stable,
incrementally maintained registry state.

### Target Contract

The registry should track each paper as stable identity plus small facets. Each
facet has its own hash so downstream workers can subscribe only to relevant
changes.

Suggested facets:

- `identity_facet`: library id, item key, canonical paper id, current citeKey,
  citeKey aliases/history.
- `metadata_facet`: title, creators, year, DOI, publication, item type, tags and
  collections summary.
- `artifact_facet`: digest, references, citation analysis, and other
  paper-level artifacts, with availability and content hashes.
- `reference_facet`: reference instance count, matched/unresolved/ambiguous
  counts, resolution summary hash.
- `readiness_facet`: topic synthesis readiness, missing inputs, warnings, and
  digest/reference/citation-analysis coverage status.
- `topic_usage_facet`: topic ids or backlinks that include this paper, used by
  topic freshness jobs.

The registry row should not be invalidated wholesale when only one facet
changes.

### Update Sources

#### Zotero Item Add

Trigger:

- Zotero item observer detects a new regular item.

Expected work:

- create or update a paper registry row for that item;
- calculate metadata/readiness fingerprint;
- mark digest/reference/citation artifacts as missing unless present;
- mark citation graph structure stale for this paper only if references exist.

Boundary:

- do not scan the whole library;
- do not rebuild citation layout.
- do not run Git Sync until canonical worker drain/debounce rules allow it.

#### Zotero Item Metadata Update

Trigger:

- item title, creators, DOI, date, BBT citeKey, or relevant metadata changes.

Expected work:

- update the paper registry row;
- update alias/history if citeKey changed;
- mark dependent paper readiness/freshness;
- only trigger citation structure work if identity or reference-relevant fields
  changed.

Boundary:

- do not invalidate unrelated papers.
- do not recompute references unless reference-relevant artifact/input hashes
  changed.

#### Zotero Item Delete

Trigger:

- Zotero item observer detects deletion or trash state transition.

Expected work:

- mark paper as deleted or unavailable;
- preserve historical identity if needed;
- mark affected citation edges stale;
- mark topics that include the paper as freshness-stale.

Boundary:

- do not delete user-confirmed topic graph relations;
- do not delete canonical topic or concept data.

#### Literature Digest Apply

Trigger:

- literature digest workflow apply succeeds.

Expected work:

- update digest artifact availability and hash;
- import structured references and citation analysis outputs if available;
- mark the paper registry row dirty;
- enqueue citation structure update for that paper.

Boundary:

- digest apply should not perform full registry rebuild;
- digest apply should not recompute citation layout.
- digest apply should record scoped dirty events for this paper and return
  without waiting for downstream citation graph work.

#### Reference Matching Apply

Trigger:

- reference matching or resolution apply succeeds.

Expected work:

- update reference resolution records;
- mark affected source paper outgoing edges stale;
- if a target work/paper resolution changed, mark affected incoming edge groups
  stale.

Boundary:

- do not recompute unrelated reference instances.
- do not recompute citation layout.

## Citation Graph Structure and Layout Split

Citation Graph should be split into two independently fresh projections.

```text
Paper Registry / Reference Records
        |
        v
Citation Structure Projection
nodes, edges, metrics
        |
        v
Citation Layout Projection
positions, viewport hints, UI layout metadata
```

### Structure Projection

Structure projection includes:

- citation nodes;
- citation edges;
- edge provenance;
- matched/unresolved/ambiguous resolution state;
- graph metrics;
- freshness/source hashes.

Structure updates should run in the background after relevant registry or
reference events.

Incremental targets:

- if a single paper's references changed, recompute that paper's outgoing edges;
- if a work resolution changed, recompute affected source papers and incoming
  target groups;
- if a paper was deleted, mark affected edges removed/stale;
- if metrics can be updated locally, update them incrementally;
- if a metric cannot be safely updated incrementally, mark only metrics stale and
  enqueue a bounded background metrics pass.

### Metrics

Graph metrics should remain available through existing host bridge and MCP read
surfaces. The redesign should preserve that contract.

Metrics are divided into two classes.

Lightweight metrics:

- source paper outgoing citation count;
- target paper incoming citation count;
- matched/unresolved/ambiguous counts;
- degree-like local counts;
- citation readiness summaries.

These should update with structure jobs whenever possible.

Complex metrics:

- centrality-like scores;
- bridge-like scores;
- community or cluster summaries;
- graph-wide ranking;
- other metrics that require large subgraph or full graph context.

These should be updated by an automatic low-priority background job. When Graph
UI needs layout and complex metrics are stale, the layout job should refresh
stale complex metrics before or during layout work.

Potential metric freshness states:

- `ready`
- `partial`
- `stale`
- `missing`
- `failed_retryable`
- `failed_permanent`

Reads should return latest usable metrics plus freshness diagnostics. Reads must
not start metric computation.

### Layout Projection

Layout is heavier and more UI-specific. It should not be recomputed merely
because structure changed.

Layout should trigger only when:

- the user opens Citation Graph UI;
- the current layout `source_graph_hash` is older than the current structure
  hash;
- complex metrics required by the layout are stale;
- the user explicitly clicks recompute layout;
- a host command explicitly asks for layout recomputation.

Expected UI behavior:

- immediately show latest usable layout if available;
- if layout is stale, show stale indicator and schedule background layout work;
- if complex metrics are stale, schedule metrics refresh as part of the
  layout/graph-view chain;
- after layout worker completes, refresh the UI snapshot;
- if layout fails, keep latest usable graph and expose diagnostics.

Boundary:

- MCP and CLI graph metrics/slice reads should not trigger layout work;
- dashboard and non-graph Workbench tabs should not trigger layout work.

## Topic Graph and Topic Freshness

Topic Graph has two separate concerns:

1. semantic graph relations;
2. topic freshness/readiness.

### Semantic Topic Graph Relations

Semantic relations should remain explicit and reviewable.

Triggers:

- topic synthesis apply ingests relation proposal sidecar;
- user accepts/rejects suggested relation;
- explicit future graph editing action.

Non-triggers:

- paper registry update;
- Zotero item update;
- digest apply;
- citation graph structure update.

Rationale:

Topic Graph edges encode semantic judgment. They should not be silently changed
by background maintenance.

### Topic Freshness

Topic freshness can follow Paper Registry state.

Examples:

- a topic includes a paper whose digest is now stale;
- a paper was deleted;
- references for topic papers changed;
- citation evidence became unavailable;
- artifact readiness changed.

Expected work:

- update topic status/freshness projection;
- mark affected topic as `stale`, `needs_review`, or equivalent;
- refresh coverage/readiness summaries from existing topic coverage/freshness
  design;
- enable or recommend update workflows when coverage/readiness thresholds are no
  longer satisfied;
- do not rewrite topic artifact content;
- do not change semantic topic graph edges.

Boundaries:

- freshness affects UI prompts and update availability only;
- background jobs must not rewrite topic markdown/JSON artifacts;
- background jobs must not submit or simulate synthesis workflows;
- affected topics should be discovered from registry topic usage facets, not by
  scanning all topics on every paper change.

## Git Sync Interaction

Git Sync should respond to canonical mutations, not projection rebuilds.

Triggers:

- successful canonical write transactions;
- topic graph accept/reject;
- concept review action;
- tag vocabulary save/import;
- topic synthesis apply canonical ingestion;
- literature canonical registry mutation if it writes canonical domain assets.

Non-triggers:

- JSON/DTO projection rebuild;
- citation layout recompute;
- runtime job state updates;
- freshness-only state in `state/`;
- read-only MCP/CLI calls.

The autosync queue should remain debounced, pausable, conflict-gated, and
lock-protected.

### Canonical Mutation Epoch

Canonical updates from registry/citation workers may occur in bursts. Git Sync
should therefore use a canonical mutation epoch rather than syncing after every
small write.

```text
canonical worker writes records
        |
        v
mark canonical epoch dirty
        |
        v
wait until active canonical workers drain
        |
        v
large debounce window
        |
        v
Git Sync run
```

Rules:

- canonical paper/reference/work/topic/concept/tag records may trigger sync;
- projection files and job state must not trigger sync;
- active canonical workers delay autosync until drained;
- default autosync debounce for KG maintenance should be large, for example
  minutes rather than seconds;
- manual sync may run sooner, but should warn if canonical workers are still
  active or pending;
- paused/conflict/lock states still block sync.

## Read Path Behavior

The following read paths should be side-effect free:

- Workbench snapshot;
- Workbench tab/filter/view changes;
- `getPaperRegistry()`;
- `queryCitationGraph()`;
- `getCitationGraphSlice()`;
- `getCitationGraphMetrics()`;
- MCP read-only tools;
- Host Bridge CLI read commands;
- dashboard load and button rendering.

Expected read output:

- latest usable data;
- freshness state;
- missing/stale diagnostics;
- explicit recommended command ids.

Unexpected read behavior:

- enqueue rebuild;
- write projection;
- write job state;
- schedule retry;
- scan whole library.

### Memory-Only Read Hints

Read paths may record process-local hints when they observe stale or missing
state. These hints exist only in memory and must not write durable job state or
start workers.

Example:

```text
hint: literature_registry_projection_read_while_stale
scope: registry
created_at: now
```

Possible future consumers:

- idle coordinator;
- Workbench diagnostics;
- manual refresh prompt.

Non-consumers:

- direct worker enqueue;
- durable job state writer;
- Git Sync;
- projection rebuild.

## Current Behavior to Change First

The first safety change should cut the implicit read-path enqueue behavior.

Known priority item:

- `getPaperRegistry()` currently enqueues `queueLiteratureRegistryRebuild()` when
  projection is missing or stale. This must become diagnostics-only.

Recommended replacement:

- return bounded rows from latest projection or best-effort registry inputs;
- include `diagnostics.stale` / `diagnostics.projection_found`;
- include recommended action such as `runLiteratureRegistryJobNow`;
- do not enqueue.

## User Experience Model

Users should be able to answer these questions from UI diagnostics:

- Is the registry current?
- If not, why?
- Is the system updating it now?
- What triggered the update?
- How large is the queued work?
- Can I pause it?
- Can I retry it?
- Is the graph structure current?
- Is the layout current?
- Am I seeing latest usable data or fresh data?

The UI should distinguish:

- `ready`
- `checking`
- `stale`
- `partial`
- `missing`
- `queued`
- `running`
- `failed_retryable`
- `failed_permanent`
- `paused`

The UI should also expose:

- latest usable data age;
- pending dirty count;
- active worker kind;
- last failure summary;
- recommended explicit command;
- whether data is fresh, stale-but-usable, partial, or missing.

## Worker Budget and Scheduling Proposal

The initial budget should be conservative and fixed. Prefs may expose tuning
later, but the first implementation should prioritize predictable behavior over
maximum throughput.

| Worker | Priority | Batch limit | Time slice | Trigger |
| --- | --- | --- | --- | --- |
| Event coalescer | P0 | 500 events | 500 ms | Dirty event writes |
| Paper Registry metadata | P1 | 50 papers | 2 s | Zotero observer / startup reconcile |
| Paper artifact facet | P1 | 10 papers | 3 s | Digest/reference apply |
| Citation structure | P2 | 20 source papers | 3 s | Registry reference facet changed |
| Topic freshness | P2 | 50 topics or links | 2 s | Registry readiness/topic usage changed |
| Complex metrics | P3 | bounded graph batch | 5 s | Citation structure changed |
| Citation layout | P4 | one graph/scope | 8 s | Graph UI open / manual recompute |
| Git Sync | P5 | one debounced run | delayed | Canonical mutation epoch drained |

Scheduling rules:

- P0/P1 work may run automatically but must yield frequently.
- P2 and lower should slow down during active UI interaction.
- P3/P4 should prefer idle time or explicit UI need.
- same-scope dirty events should coalesce;
- one worker of each kind should run at a time;
- new dirty events extend queued scope rather than starting concurrent work;
- retry backoff should use 1 minute, 5 minutes, 15 minutes, then 30 minutes;
- paused mode records dirty state but does not process workers.

## Suggested OpenSpec Change Split

## Change 1: Trigger Safety and Read Path Purity

Goal:

- make all read paths side-effect free;
- introduce explicit diagnostics and recommended actions;
- prevent MCP/CLI/UI reads from starting background rebuilds.

Likely tasks:

- remove enqueue from `getPaperRegistry()`;
- audit citation graph read paths;
- audit Workbench snapshot and dashboard paths;
- add memory-only read hints without durable side effects;
- add tests asserting read methods do not write job/projection state;
- update trigger map documentation.

## Change 2: Synthesis Update Event Journal

Goal:

- introduce durable event/dirty queue as the only automatic update input.

Likely tasks:

- define event DTO and DB storage;
- add event writer helpers;
- add queue coalescing and batch policy;
- add observability state;
- add startup reconcile event shape;
- keep workers minimal initially.

## Change 3: Paper Registry Incremental Maintenance

Goal:

- make Paper Registry update by scoped dirty events.

Likely tasks:

- add per-paper fingerprints;
- split registry row into identity, metadata, artifact, reference, readiness,
  and topic usage facets;
- implement digest apply to paper dirty event;
- implement reference matching apply to paper/reference dirty event;
- add Zotero item observer and startup lightweight reconcile scan;
- keep full rebuild as explicit repair command.

## Change 4: Citation Graph Incremental Structure

Goal:

- rebuild citation structure from affected papers/works rather than whole
  library.

Likely tasks:

- represent source paper outgoing edge ownership;
- update affected edges by paper;
- preserve graph metrics contract;
- update lightweight metrics with structure jobs;
- move complex metrics to automatic low-priority background work;
- keep latest usable graph on failure.

## Change 5: Citation Graph Layout on Demand

Goal:

- recompute layout only when Graph UI needs a newer layout.

Likely tasks:

- add `source_graph_hash` to layout projection;
- trigger layout worker from Graph UI open or explicit command;
- refresh stale complex metrics before or during layout work;
- refresh UI after layout completion;
- avoid layout work from MCP/CLI reads.

## Change 6: Topic Freshness from Paper Registry

Goal:

- update topic readiness/freshness based on paper registry changes without
  changing semantic topic graph relations.

Likely tasks:

- map paper refs to topics;
- mark affected topics stale/needs-review;
- refresh coverage/readiness summaries under task budget;
- surface status in Workbench;
- avoid rewriting topic artifacts.

## Change 7: Git Sync Canonical Epoch

Goal:

- prevent incremental canonical maintenance from causing excessive sync runs.

Likely tasks:

- add canonical worker active/drain state;
- mark canonical mutation epochs dirty;
- delay autosync until active canonical workers drain;
- use a large debounce window for maintenance-driven sync;
- keep manual sync available with stale/pending warnings.

## Open Questions

1. Should layout recompute be cancelable when the user leaves Graph view, or
   should it continue because the result is likely reusable?
2. How should users configure automatic updates after v1: always on, paused by
   default, enabled per domain, or adaptive based on library size?
3. What exact metadata fields belong in the startup reconcile fingerprint?
4. Which complex metrics are required for v1, and which can remain
   stale/partial until explicit graph use?
5. What thresholds should topic coverage/freshness use to recommend
   `update_patch` versus `update_full`?

## Current Recommendation

Start with safety, not capability.

The first implementation change should remove rebuild side effects from read
paths and expose clear diagnostics. Only after that should the event journal and
incremental workers be added. This avoids making current performance problems
worse while giving future changes a cleaner foundation.
