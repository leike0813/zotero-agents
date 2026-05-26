## 1. Spec and Schema Design

- [ ] Add delta specs for SQLite-first Synthesis local working state.
- [ ] Define DB table groups, indexes, repository APIs, and JSON cold-path
      boundaries.
- [ ] Define cleanup/reference decision actions and review queue semantics.
- [ ] Define read-path purity and performance acceptance requirements.

## 2. SQLite Repository Foundation

- [ ] Add typed Synthesis repository/migration layer in `state/zotero-agents.db`.
- [ ] Add transaction, query, pagination, and performance measurement helpers.
- [ ] Add base tables for schema meta, dirty events, job state, reviews, papers,
      works, references, and resolutions.
- [ ] Add tests for idempotent migration, rollback, indexes, and no reliance on
      `plugin_task_rows.payload_json` for Synthesis hot state.

## 3. Literature Registry DB-First

- [ ] Persist papers, facets, works, reference instances, resolutions, contexts,
      and cleanup items in SQLite.
- [ ] Make `getPaperRegistry()`, Workbench Index, and MCP registry reads query
      SQLite only.
- [ ] Replace cleanup `approve/reject/skip` UI with real reference decision
      actions.
- [ ] Ensure cleanup decisions update review state and related resolution/work
      rows in one transaction.

## 4. Citation Graph DB-First

- [ ] Persist citation nodes, edges, ownership, incoming groups, metrics, and
      layout metadata in SQLite.
- [ ] Make graph slice, metrics, and Workbench graph reads use bounded DB
      queries.
- [ ] Remove large JSON graph projection from the hot path.
- [ ] Keep explicit JSON export/checkpoint support separate from graph reads.

## 5. Topic, Concept, and Tag DB-First

- [ ] Persist Topic Graph runtime state in SQLite and serve Topics UI from DB.
- [ ] Persist Concept KB runtime state in SQLite and serve Concepts UI from DB.
- [ ] Persist Tag Vocabulary runtime state in SQLite while preserving TagVocab
      import/export.
- [ ] Keep JSON checkpoint export explicit for each domain.

## 6. Import and Export Tooling

- [ ] Add dry-run/apply import script from existing `data/synthesis/` JSON
      canonical/projection data into SQLite.
- [ ] Add explicit SQLite-to-JSON checkpoint export command.
- [ ] Add verify-only mode comparing DB counts/hashes with checkpoint assets.
- [ ] Do not auto-migrate at plugin startup.

## 7. Performance Acceptance

- [ ] Add synthetic 1k/10k paper datasets for DB query and worker benchmarks.
- [ ] Add budgeted tests for Workbench snapshot, Index filter, cleanup decision,
      graph slice, metrics read, and worker batch.
- [ ] Add diagnostic timing output for budget failures.
- [ ] Run targeted Synthesis tests, OpenSpec validation, typecheck, and
      formatting checks.
