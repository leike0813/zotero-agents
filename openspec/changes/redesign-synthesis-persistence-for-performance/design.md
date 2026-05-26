# Design

## Architecture Direction

Synthesis will use a two-layer persistence model:

1. **SQLite local working state** in `state/zotero-agents.db`.
   This is the runtime source of truth for UI, MCP, Host Bridge, review actions,
   dirty queues, job state, and incremental workers.
2. **JSON canonical checkpoint assets** in `data/synthesis/`.
   These are cold-path import/export/checkpoint artifacts and future sync
   payloads. They are not the default read source for Workbench snapshots or
   background maintenance.

The previous JSON canonical store remains valuable for auditability and future
sync, but using it as the hot path has unacceptable small-file IO and projection
rewrite costs.

## SQLite Repository Boundary

Add a typed Synthesis repository layer instead of reusing
`plugin_task_rows.payload_json` for high-frequency Synthesis state. The
repository owns schema migration, transactions, indexed queries, and bounded DTO
assembly.

Minimum table groups:

- schema/meta and performance counters;
- papers, paper facets, works, work aliases;
- reference instances, resolutions, citation contexts;
- cleanup/review items and reference resolution decisions;
- citation nodes, edges, ownership, incoming groups, metrics, layout metadata;
- topic graph nodes, edges, relation review items;
- concept records, senses, aliases, relations, review items;
- tag vocabulary rows, aliases, abbrevs, validation state;
- dirty events, job state, freshness state, worker run history.

The repository should expose typed operations such as:

- `withSynthesisTransaction(work)`
- `upsertPaperRegistryFacet(...)`
- `listPaperRegistryRows(query)`
- `applyReferenceCleanupDecision(...)`
- `listCitationGraphSlice(query)`
- `listReviewItems(domain, query)`
- `recordDirtyEvent(...)`
- `claimDirtyBatch(worker, budget)`

## JSON Cold Path

JSON assets are generated or consumed only through explicit commands:

- import current JSON canonical/projection fixture into SQLite;
- export SQLite state into canonical JSON checkpoint;
- verify checkpoint consistency;
- future Git Sync export/import.

Normal review actions, registry updates, citation graph updates, topic graph
updates, concept edits, and Workbench snapshots must not write or read JSON
canonical files as their primary path.

## Literature and Cleanup Semantics

Cleanup proposals become true reference resolution decisions. An action must
update related DB rows in one transaction, not merely change the proposal's
status.

V1 decision actions:

- `confirm_reference_work`: accept the reference as a reference-only work and
  make it visible in registry/graph views as such;
- `match_existing_paper`: bind the reference instance to an existing paper;
- `ignore_reference`: suppress the reference from cleanup queues without
  promoting it.

Legacy `approve/reject/skip` host actions may be translated temporarily, but the
UI must use decision names that describe the actual outcome.

## Citation Graph DB Model

Citation graph runtime state is split into indexed DB tables:

- nodes and edges;
- source-paper outgoing ownership;
- target/work incoming groups;
- lightweight metrics updated with structure;
- complex metrics updated by low-priority worker;
- per-preset layout metadata and coordinates.

Read APIs return bounded DTOs from these tables. They must not assemble a full
graph JSON unless explicitly requested by export/checkpoint tooling.

## Worker Model

Workers consume DB dirty events under explicit budgets. Each worker records:

- claimed event ids;
- started/completed timestamps;
- processed/completed/failed counts;
- retry attempt and next retry time;
- elapsed time and budget exhaustion;
- sanitized diagnostics.

Unsafe scopes mark a broader state stale and recommend explicit repair. They do
not silently run full rebuilds.

## Performance Acceptance

This change treats performance as a first-class contract. The implementation
must include synthetic large-data scenarios and measure at least:

- Workbench snapshot input;
- Index search/filter query;
- cleanup decision transaction;
- citation graph slice query;
- citation metrics query;
- worker batch processing.

The exact budgets can be tuned during implementation, but tests must fail with
diagnostic timing output when a path regresses beyond the chosen budget.
