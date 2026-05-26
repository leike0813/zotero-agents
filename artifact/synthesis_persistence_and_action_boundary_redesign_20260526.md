# Synthesis Layer Persistence and Action Boundary Redesign

Date: 2026-05-26

Status: discussion artifact

## Purpose

This document records a proposed redesign for Synthesis Layer persistence,
business action semantics, and background update boundaries. It is intentionally
broader than a persistence-only note because the current usability problem is
not caused by storage alone. The storage model, domain action semantics,
background workers, Workbench UI, and MCP/Host Bridge read contracts are tightly
coupled.

The goal is to settle the design before implementation, so future work can land
in fewer coherent changes instead of continuing to patch JSON projections,
review cards, and background jobs one issue at a time.

## Current Diagnosis

The current Synthesis Layer is functionally broad but not yet product-usable.
Several parts are wired together, but the system still exposes implementation
details and performs too much work on paths that users expect to be fast.

### Storage Problem

The current model treats `data/synthesis/` JSON canonical assets as the main
runtime source of truth. This gives auditability and future sync compatibility,
but it is a poor hot path for a Zotero plugin:

- many small JSON files cause expensive filesystem IO;
- large projection JSON files are repeatedly read, parsed, hashed, and rewritten;
- Workbench snapshots need cross-domain joins that are awkward and slow over
  files;
- review actions can update canonical state while UI still reads stale
  projection state;
- background workers still spend time materializing JSON/DTO projections instead
  of updating indexed local state.

### Business Semantics Problem

Some actions do not yet mean what the UI implies. The clearest example is Index
Cleanup:

- UI presents `approve / reject / skip` as if the user is deciding what should
  happen to an unresolved reference.
- The current backend only changes the cleanup proposal status.
- It does not create or expose a reference-only work in Index.
- It does not match the reference to an existing paper.
- It does not update the reference resolution semantics in a user-visible way.

This makes the UI appear broken even when the transaction technically succeeds.

### Background Work Problem

The current “background job queue” is asynchronous, but not lightweight enough.
Jobs still run in the plugin runtime and may perform expensive JSON IO, hashing,
graph assembly, metrics, and layout work. The user experiences this as slow
buttons, delayed UI response, flicker, and unpredictable busy periods.

### UI Contract Problem

The Workbench still reflects internal state too directly:

- `proposal_id`, `itemKey`, edge ids, projection stale states, and job names
  appear where user-facing concepts should appear.
- Several pages refresh in ways that reset scroll or rebuild heavy widgets.
- Review cards sometimes show a decision prompt before the underlying action has
  a clear business effect.

## Design Position

The Synthesis Layer should move to a DB-first local working model:

```text
SQLite local working state       = runtime source of truth
JSON canonical/checkpoint assets = cold import/export/audit/sync boundary
Runtime files                    = large artifacts, caches, logs, workspaces
Prefs                            = configuration and small flags only
```

The decisive change is that Workbench, MCP, Host Bridge, and background workers
should not use JSON canonical files as their normal read/write surface.

## Persistence Model

### SQLite-First Local State

`state/zotero-agents.db` should contain typed Synthesis tables for hot state.
This DB should be the default source for:

- Paper Registry rows and facets;
- works and work aliases;
- reference instances;
- reference resolutions;
- citation contexts;
- cleanup/review decisions;
- citation graph nodes and edges;
- citation graph ownership and incoming groups;
- lightweight and complex metrics;
- layout metadata and coordinates;
- topic graph nodes, edges, and review items;
- concept records, senses, aliases, relations, and review items;
- tag vocabulary rows, aliases, abbrevs, and validation state;
- dirty events, job state, worker run history, and freshness state.

The existing `plugin_task_rows.payload_json` table is useful for generic plugin
tasks, but it should not remain the primary storage mechanism for high-frequency
Synthesis domain state. Synthesis needs typed tables, indexes, transactions,
and bounded queries.

### JSON Canonical Assets as Cold Path

`data/synthesis/` should remain durable, but its role changes:

- explicit checkpoint/export target;
- explicit import source;
- future Git Sync envelope source;
- audit and debugging material;
- migration/test fixture input.

Normal UI actions, review actions, registry updates, concept edits, and topic
graph updates should not write one JSON file per changed record. Instead, they
should update SQLite, then optional explicit checkpoint/export can serialize DB
state to JSON.

### Runtime Files

Runtime files remain appropriate for:

- ACP/skill run workspaces;
- large generated artifacts;
- logs;
- caches;
- temporary files;
- workflow product assets.

Runtime cleanup must never delete Synthesis durable data or SQLite state.

## Business Domains and Action Semantics

### Paper Registry

Paper Registry is the foundation of the Synthesis Layer. It should be maintained
incrementally through DB facets:

- identity facet: library id, item key, deleted/trash state;
- metadata facet: title, creators, year, DOI, URL, arXiv, citeKey, tags,
  collections;
- artifact facet: digest/reference/citation-analysis artifact availability and
  hashes;
- reference facet: reference instances and resolution summaries;
- readiness facet: coverage, missing artifacts, diagnostics;
- topic usage facet: paper-to-topic usage links and freshness signals.

Registry reads should be indexed DB queries, never Zotero full scans or JSON
projection reads.

### Reference Resolution and Cleanup

Cleanup should be redesigned as explicit reference resolution decisions. The
current `approve / reject / skip` vocabulary is too vague.

Proposed v1 actions:

- `confirm_reference_work`: confirm that an unresolved reference should remain
  as a reference-only work. It becomes visible in Index and Citation Graph as a
  reference-only entity.
- `match_existing_paper`: bind the reference instance to an existing library
  paper. This updates reference resolution and invalidates affected citation
  graph structure.
- `ignore_reference`: close the review item without promoting a work or matching
  a paper. It remains auditable but no longer blocks cleanup.

Each action must update review state, reference resolution, affected work/paper
summary, and dirty events in one DB transaction.

### Citation Graph

Citation Graph should be DB-first and split into layers:

- structure: nodes, edges, outgoing ownership by source paper, incoming groups
  by target/work;
- lightweight metrics: counts and local degree-like metrics updated with
  structure;
- complex metrics: PageRank/component/frontier-style metrics updated by a
  low-priority worker;
- layout: per-preset coordinates and metadata, triggered by Graph UI or explicit
  recompute only.

MCP and CLI reads should never trigger graph rebuild, complex metrics, or
layout. They should return latest usable rows and diagnostics.

### Topic Graph

Topic Graph semantic relations are produced by topic synthesis apply or user
review. They should not be rewritten by Paper Registry background workers.

Topic freshness can be affected by Paper Registry changes, but freshness only
changes UI prompts and update availability. It must not automatically rewrite
topic artifacts or semantic relations.

### Concept KB

Concept records, aliases, senses, relations, and review queue should be stored
in SQLite as hot state. Concept proposal ingestion and review decisions should
update DB state transactionally. JSON concept assets should be generated only by
explicit checkpoint/export.

### Tag Vocabulary

Tag Vocabulary should keep TagVocab protocol compatibility, but the active
vocabulary used by UI and tag-regulator should come from SQLite rows. Import
preview and apply should update DB state first; JSON checkpoint export can write
TagVocab-shaped files.

## Background Work Model

### Event Source

Automatic work should only start from mutation events, not reads:

- Zotero item add/update/delete/restore observer;
- literature digest apply;
- reference matching apply;
- topic synthesis apply;
- concept/topic/tag review action;
- explicit rebuild/retry/recompute command.

Read paths may report diagnostics and recommended commands, but must not enqueue
workers or rebuild projections.

### Dirty Queue

Dirty events should live in SQLite with indexed fields:

- event type;
- source;
- scope kind and scope ref;
- source hash;
- status;
- attempt count;
- next retry time;
- diagnostics;
- created/updated timestamps.

Events should coalesce by meaningful scope, for example one paper, one work, one
topic, or one graph preset.

### Worker Budget

Workers must process bounded batches:

- batch size limit;
- time budget;
- pause/resume;
- retry/backoff;
- latest failure diagnostics;
- run history and measured duration.

Unsafe scope should mark a broader state stale and recommend explicit repair,
not silently run a full rebuild.

## UI and Read API Contracts

### Workbench

Workbench snapshots should read lightweight DB view models:

- active tab summary;
- bounded table rows;
- one current review card per domain;
- graph slice for current graph view;
- job state summary;
- diagnostics and recommended commands.

Workbench must not scan JSON canonical files, rebuild projections, or assemble
full graph DTOs just to render a page.

### MCP and Host Bridge

Read-only tools should be DB-only and bounded:

- `get_paper_registry`;
- citation graph slice;
- citation graph metrics;
- topic/concept/tag read views.

If data is missing or stale, they should return diagnostics and recommended
commands. They should not enqueue rebuild work.

### User-Facing Action Labels

Action labels must describe actual outcomes. For example:

- do not use `Approve` if it only marks a proposal status;
- use `Confirm as reference work`, `Match to paper`, or `Ignore reference`
  when those are the actual effects.

This rule should apply across cleanup, concept review, topic graph review, tag
import, and Git conflict resolution.

## Import, Export, and Test Data

Because Synthesis is not production-launched yet, no production auto-migration
is required. However, existing test data and agent-produced artifacts are
valuable.

Required tooling:

- dry-run import from current `data/synthesis/` JSON canonical/projection files
  into SQLite;
- apply mode that populates DB without deleting JSON source;
- verify mode comparing counts, hashes, and unresolved records;
- checkpoint export from SQLite back to JSON canonical assets;
- synthetic data generator for 1k and 10k paper performance tests.

The import script is a developer/test operation, not startup behavior.

## Performance Acceptance Targets

Exact budgets should be tuned during implementation, but the system needs hard
performance gates. Suggested initial targets on synthetic local data:

- Workbench snapshot for a non-graph tab should be bounded and not scale with
  total citation graph size.
- Index filter/search should use SQL indexes and return within an interactive
  threshold for 10k papers.
- Cleanup decision should be one DB transaction and visible in the next snapshot
  without projection rebuild.
- Citation graph slice should scale with requested slice size, not whole graph
  size.
- Worker batch should report processed count, elapsed time, and budget
  exhaustion.

Performance tests should fail with timing diagnostics, not just generic timeout
messages.

## Proposed Implementation Order

1. Create the OpenSpec change and lock requirements.
2. Build the Synthesis SQLite repository foundation and migrations.
3. Move Literature Registry and cleanup decisions to DB-first.
4. Move Citation Graph structure, metrics, and layout metadata to DB-first.
5. Move Topic Graph, Concept KB, and Tag Vocabulary hot state to DB-first.
6. Add JSON import/export/checkpoint tooling.
7. Add large synthetic performance tests and manual verification scripts.
8. Only after DB-first hot paths are stable, revisit Git Sync export/import.

## Open Questions

- Should Topic Graph and Concept KB share one generic review table, or keep
  domain-specific tables with a shared view?
- Should reference-only works appear in the same Index table as library papers,
  or in a separate grouped section with filters?
- What are acceptable initial performance budgets for 1k and 10k paper
  datasets on the target Zotero runtime?
- Should checkpoint export be user-facing in Workbench, developer-only, or both?
- Should old JSON canonical assets be considered authoritative during import
  conflicts, or should DB state always win once initialized?

## Working Assumptions

- Performance and product usability take priority over preserving the current
  JSON-hot-path implementation.
- No automatic production migration is needed.
- Existing JSON data should be importable for development/test continuity.
- Future Git Sync will export from SQLite to canonical JSON envelopes instead of
  syncing hot-path files.
- No new npm dependency should be introduced for this redesign.
- SQLite/DB-first work should be implemented in staged, testable slices, but the
  target architecture should be agreed before code migration starts.
