## 1. Spec and Schema Design

- [x] 1.1 Sync OpenSpec design with the Chinese design artifacts.
- [x] 1.2 Define SQLite table groups, primary keys, indexes, and repository API boundaries.
- [x] 1.3 Define registry cache `literature_item` identity, normalized title, Zotero binding, reference resolution, and lifecycle semantics.
- [x] 1.4 Define review dependency ordering and transactional consequences.
- [x] 1.5 Define JSON cold-path import / export / checkpoint boundaries.

## 2. Repository Foundation

- [x] 2.1 Add typed Synthesis repository / migration layer in `state/zotero-agents.db`.
- [x] 2.2 Add schema meta, transaction, query, pagination, and rollback helpers.
- [x] 2.3 Add base tables for dirty events, job state, review queue, literature items, identifiers, Zotero bindings, references, and resolutions.
- [x] 2.4 Add tests for idempotent migration, rollback, indexes, and no hot-path reliance on `plugin_task_rows.payload_json`.

## 3. Registry Cache DB-first and Review Closure

- [x] 3.1 Persist `literature_item`, identifiers, Zotero bindings, artifacts, reference instances, reference resolutions, and review items in SQLite.
- [x] 3.2 Make `getPaperRegistry()`, Workbench Index, and MCP registry reads query SQLite only.
- [x] 3.3 Implement Registry/Index UI read model: Zotero-bound top-level rows, expandable references, and `Only referenced literature`.
- [x] 3.4 Replace cleanup `approve/reject/skip` semantics with reference match / create registry item / ignore / defer actions.
- [x] 3.5 Implement Zotero deletion / dedupe review actions and bounded review dependency maintenance.
- [x] 3.6 Ensure review actions update domain facts, review state, registry summary, graph structure dirty effects, and diagnostics in one transaction.

## 4. Citation Graph DB-native Projection

- [x] 4.1 Persist citation nodes, edges, source ownership, incoming groups, and lightweight metrics in SQLite.
- [x] 4.2 Update citation structure and lightweight metrics synchronously from registry cache write transactions.
- [x] 4.3 Make graph slice, metrics, and Workbench graph reads use bounded DB queries.
- [x] 4.4 Move complex metrics to a low-priority DB worker.
- [x] 4.5 Keep layout UI-driven and separate from structure / metrics updates.

## 5. Topic Freshness and Discovery

- [x] 5.1 Remove freshness / discovery work from read paths.
- [x] 5.2 Add minimal `literature_matching_metadata` and `topic_interest_metadata` DB contracts.
- [x] 5.3 Update `literature-digest`, `create-topic-synthesis`, and `update-topic-synthesis` contracts as needed.
- [x] 5.4 Add BM25 / equivalent discovery hints as candidate-only state.
- [x] 5.5 Ensure topic freshness marks known dependency dirty separately from discovery hints.

## 6. Topic, Concept, and Tag Runtime DB-first

- [x] 6.1 Persist Topic Graph runtime state and review items in SQLite.
- [x] 6.2 Persist Concept KB runtime state and review items in SQLite.
- [x] 6.3 Persist Tag Vocabulary runtime state in SQLite while preserving TagVocab import / export contracts.
- [x] 6.4 Keep JSON checkpoint export explicit for each domain.

## 7. JSON Import / Export / Checkpoint Tooling

- [x] 7.1 Add dry-run / apply import from existing `data/synthesis/` JSON canonical / projection data into SQLite.
- [x] 7.2 Add explicit SQLite-to-JSON checkpoint export command.
- [x] 7.3 Add verify-only mode comparing DB counts / hashes with checkpoint assets.
- [x] 7.4 Do not auto-migrate at plugin startup.

## 8. Background Job Profiler and Performance Acceptance

- [x] 8.1 Add debug-mode-only Synthesis background job profiler with independent `state/debug/synthesis-job-profiler.db`.
- [x] 8.2 Ensure profiler is no-op when project debug mode is off.
- [x] 8.3 Add synthetic 1k / 10k paper datasets for DB query and worker benchmarks.
- [x] 8.4 Add budgeted tests for Workbench snapshot input, Registry/Index filter, review action, graph slice, metrics read, and worker batch.
- [x] 8.5 Ensure budget failures output diagnostic timing breakdown.

## 9. Validation

- [x] 9.1 `openspec validate "redesign-synthesis-persistence-for-performance" --strict`
- [x] 9.2 Targeted Synthesis core tests for repository, registry cache, review actions, citation graph, topic discovery, and Workbench UI.
- [x] 9.3 MCP read-only regression tests.
- [x] 9.4 `npx tsc --noEmit`
- [x] 9.5 Prettier check for changed TS / MD / JSON files.
