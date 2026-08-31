## Context

The default Literature Export currently delegates to the Research Product builder. That builder intentionally stores a compact research snapshot: one source for core papers and recognized payload projections, not a complete Zotero child graph. The lossless v1 Literature serializer and importer still contain the required attachment, note, image, and relation behavior. Separately, the Research runtime executes library search before Topic assessment and reads `resolved_paper_set` from a Host command whose normal inline response omits it.

The bundle package uses in-code manifest validation and a content-addressed `files` map. The Research Skill is a Tier 6 SQLite state-machine with an automation-facing contract; its stage ids, DB tables, gate entrypoint, and final schemas are already stable.

## Goals / Non-Goals

**Goals:**

- Give Literature Export its own complete, Agent-readable Product contract without contaminating the compact Research Product contract.
- Reuse one lossless attachment/note snapshot path and one bibliography fallback implementation.
- Make Topic membership and library search the only Research candidate sources, with deterministic provenance merging.
- Preserve import compatibility for Literature v1 and Research Product v2 packages already produced.

**Non-Goals:**

- Preserve source Zotero item ids, keys, sync versions, collections, or external relations as target identities.
- Change source-only export, workflow parameters, Research selection schemas, SQLite schema, stage ids, or Host Bridge surfaces.
- Localize the Literature Product's deterministic Agent README and index.

## Decisions

### 1. Use a distinct Literature Product identity

Default Literature Export writes `literature_bundle.product@1.0.0` with a `papers/paper-###` layout. Its paper record contains portable metadata, all direct attachment records, all notes and note images, Agent payload projections, a `primary_source` reference, and package-local relations. Research Product remains `research_bundle.product@2.0.0`.

Extending Research Product with a migration mode was rejected because it would make every consumer branch on a mode that changes the meaning of sources, notes, and importability. Reverting only to the old `items/i#` archive was rejected because it would discard the Agent-facing Product layout introduced for downstream consumption.

### 2. Make lossless records authoritative and projections read-only

The v1 Literature serialization logic becomes a private parent-snapshot layer inside `literatureBundle.mjs`. The new builder maps the snapshot into the Product layout. `primary_source` references an attachment record and never writes duplicate source bytes.

Recognized embedded Workbench payloads are also rendered as Markdown/JSON below `payloads/`, linked to their source note and note-image ids. These files are deliberate Agent projections. The importer materializes only the original attachment and note records, so projections cannot duplicate Zotero children.

### 3. Extract only genuinely shared deterministic helpers

Better BibTeX/native BibTeX fallback, provenance, and warnings move to `bundleBibliography.mjs` and are used by both Product builders. Payload type-to-filename and payload-to-text conversion move to the existing embedded-payload module. Research and Literature README/index renderers remain separate because their public semantics and tables differ.

### 4. Validate the entire Product before mutation

The Literature Product validator checks schema identity/version, owner-scoped id uniqueness, relationship closure, primary-source attachment equivalence, payload source-note/source-image references, declared-entry ownership, and `files` size/hash closure. Materialization then creates parents, direct attachments, notes/images, and finally package-local relations. Per-paper rollback and partial-result behavior remain unchanged.

### 5. Reuse the Research state machine while changing Stage 20/40 responsibilities

Stage 20 only refreshes Topic inventory. Stage 30 assesses Topics from that inventory. Stage 40 calls `synthesis topic get-context` for each selected Topic, persists sorted resolved refs, executes the Stage 10 query plan, and upserts both sources into the existing `paper_candidates` representation by `paper_ref`. The existing search preview may be rendered only after Stage 40 search completes.

Graph/reference/digest reads enrich existing candidates but do not call candidate upsert for graph neighbors. Topic candidates remain exempt from semantic threshold, assessment-budget truncation, and `maxRelatedPapers`; core role count remains bounded.

### 6. Keep the Skill current-state only

`SKILL.md` keeps its SQLite/gate architecture and machine I/O contract. The frontmatter description states only capability and trigger. The body contains Mission, Non-goals, I/O, gate/stage flow, LLM/runtime responsibilities, references to schemas/scripts, failure recovery, and examples, without a duplicate When-to-Use section or compatibility history.

## Risks / Trade-offs

- **[Larger Literature ZIPs]** Complete attachments plus decoded payload projections intentionally duplicate payload meaning. → Keep original payload bytes authoritative for import and restrict derived duplication to recognized text projections.
- **[New manifest validator complexity]** More reference types can allow unsafe partial mutation if validation is incomplete. → Validate all ids, references, paths, ownership, and hashes before target resolution or Zotero writes.
- **[Topic context response drift]** Host responses may fail or omit the paper set. → Distinguish command failure, malformed/missing paper sets, and valid empty sets through structured diagnostics while continuing other sources.
- **[Research recall decreases without graph expansion]** Graph-only neighbors no longer enter assessment. → Retain graph metrics and diagnostics for Topic/search candidates; candidate provenance stays explainable and matches the declared workflow.

## Migration Plan

1. Add failing public-behavior tests for the new Literature Product and Topic-first Research flow.
2. Introduce the Literature Product builder/validator/importer and shared deterministic helpers while retaining existing import adapters.
3. Reassign Stage 20/40 runtime responsibilities and remove graph-neighbor candidate insertion.
4. Update Skill/docs/specs and run strict OpenSpec, manifest, lint, and targeted behavior validation.
5. Rollback, if needed, consists of reverting the new default builder/runtime ordering; no persistent Zotero or SQLite migration requires reversal.
