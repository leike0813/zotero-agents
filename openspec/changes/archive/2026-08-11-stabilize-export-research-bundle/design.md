## Context

See `proposal.md` for motivation. The existing Skill is a gate-driven SQLite state machine whose Stage 10 stores 2–8 free-form query strings and whose Stage 40 sends each string once to non-pageable metadata substring search. A successful bridge call is currently counted independently from returned or canonicalized candidates, and a zero-packet Stage 50 advances unconditionally.

Topic Synthesis does not provide a reusable text-search implementation: its resolver filters a full registry by explicit tags, collection keys, and paper references. Its useful architectural precedent is the ownership split in which the Agent proposes a structured boundary, the runtime deterministically materializes a bounded workset, and the Agent performs paper-local semantic assessment.

The live Workflow parameter forms are separate static scripts with duplicated number validation. Workflow descriptors already carry `min` and `max`, but neither form enforces them. SkillRunner publishes its parameter JSON Schema separately from the workflow manifest, so those two projections must remain synchronized while Python runtime constants can be eliminated.

## Goals / Non-Goals

**Goals:**

- Increase metadata-search recall without scanning the full Zotero library or weakening Stage 50 relevance assessment.
- Make every zero-candidate path distinguishable and resumable from persisted evidence.
- Preserve existing output kinds, Product registration rules, SQLite authority, and non-UI clamping behavior.
- Give the two live Workflow forms one integer/range validation implementation and derive label hints from declared bounds.

**Non-Goals:**

- Attachment full-text search, semantic embeddings, or a new Host Bridge capability.
- Importing Topic Synthesis runtime code or using its full-library resolver as anonymous text search.
- Adding tables, changing Research Product layout, or changing the meaning of mandatory Topic papers.
- Reviving or redesigning the unused legacy XUL settings dialog.

## Decisions

### Use an Agent-authored metadata-anchor plan

Each Stage 10 query entry keeps `query` and `focus` and adds `fallback_queries`, containing one to three shorter literal metadata anchors. The Agent owns terminology, synonyms, language, and academic meaning. The runtime owns Unicode NFKC normalization, whitespace normalization, case-insensitive stable deduplication, ordering, and budgets.

This follows Topic Synthesis's resolver/workset ownership boundary without copying its full-library data path. Runtime token guessing was rejected because scripts cannot reliably decide which words retain the research meaning; prompt-only guidance was rejected because it cannot enforce recovery or auditability.

### Page the existing library-items query

Stage 40 uses the existing `library items list` command with `query`, `limit`, and `cursor`. It reads at most two 50-item pages per anchor, executes fallback anchors only after a primary returns no canonical candidate, executes at most 24 distinct anchors, and stops optional discovery at the existing candidate budget. A source that still has more pages at a limit records truncation instead of claiming exhaustive discovery.

No Host Bridge surface changes are needed. The non-pageable search command was rejected because its `truncated` flag cannot be resumed; library snapshot and Synthesis resolver were rejected because both hydrate a full-library index.

### Persist one discovery summary without adding tables

Stage 40 writes `discovery_summary` to existing metadata and mirrors its compact form in the stage result and receipts. The summary has one status (`ready`, `empty_confirmed`, or `incomplete`) plus stable query, page, Topic, row, candidate, dropped-reason, failure, and truncation counts. Existing diagnostics retain row-level stable codes.

`ready` requires at least one canonical candidate. `empty_confirmed` requires every relevant response to be valid and explicitly empty. `incomplete` covers unavailable or malformed required evidence, non-empty rows with no usable identity, and all-source failure. Partial bad rows may coexist with `ready` when at least one reliable candidate remains.

Stage 50 may advance without packets only for `empty_confirmed`, and records a skip reason. Stage 70 may emit `no_related_literature` only for that state or after real assessments reject every optional candidate with no mandatory Topic paper.

### Keep source-specific canonicalization strict

Library item rows must contain the current DTO's non-empty `key` and positive `libraryId`. Topic resolved sets accept canonical refs from their defined `papers[*].paper_ref`, canonical string `papers[*]`, and `paper_refs[*]` slots. The runtime does not recursively search arbitrary wrappers or accept ungoverned aliases, which would hide protocol drift and risk treating diagnostic metadata as a mandatory paper.

### Make the Skill parameter schema authoritative for runtime limits

`parameter.schema.json` retains defaults 5/20/80 and raises maxima to 10/50/200. `stage_runtime.py` loads and validates those bounds relative to its own package path, then applies the existing clamp behavior. The workflow manifest mirrors the same contract for plugin UI; a parity test prevents drift between the separately published surfaces.

### Add one shared browser number helper

`addon/content/shared/workflow-number-validation.js` exposes pure label-formatting and validation functions to both static Workflow forms. The generic Workflow parameter contract gains optional `integer`; descriptors preserve it. The helper returns stable error codes for non-number, non-integer, below-minimum, and above-maximum values, while each form continues to own its user-facing message.

When both bounds are finite, the helper appends `(min–max)` to the already localized title. This keeps numeric limits out of locale strings. HTML `min`, `max`, and `step=1` are hints; JavaScript validation remains authoritative before confirm or auto-save.

## Risks / Trade-offs

- [Short fallback anchors can return noise] → Bound anchors, pages, and candidates; retain provenance; require every candidate to pass Stage 50.
- [Metadata-only search still misses attachment-only evidence] → State the scope in Skill and user documentation; reserve full-text discovery for a separate Host capability change.
- [A 200-paper selection can increase assessment cost] → Keep defaults unchanged, cap optional candidates at the existing maximum budget, and expose limits before execution.
- [Manifest and Skill parameter schema are separate projections] → Load the Skill schema directly in Python and add a parity test for defaults, bounds, and integer semantics.
- [Partially damaged sources can produce ambiguous emptiness] → Prefer `incomplete` and retry over a false business cancellation; retain stable diagnostics and action receipts.

## Migration Plan

1. Publish the workflow manifest and Skill package together so their parameter contracts advance as one content set.
2. Existing saved defaults remain valid because defaults do not change; values above prior maxima become available only when users opt in.
3. In-progress runs resume from SQLite. Stage 40 recomputation writes the discovery summary before later gates can advance.
4. Rollback restores the previous content package; no database migration or Product migration is required.
