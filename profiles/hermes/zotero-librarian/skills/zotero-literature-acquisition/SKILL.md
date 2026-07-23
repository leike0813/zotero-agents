---
name: zotero-literature-acquisition
description: Discover, evaluate, and acquire literature for a Zotero library. Use when a user asks to find, import, prepare, or deduplicate literature for a current research task.
---

# Zotero Literature Acquisition

## Goal

Turn a bounded literature need into a traceable candidate assessment or a live-verified, approved acquisition outcome while preserving external provenance, Zotero identity, duplicate state, and attachment readiness.

## Inputs

- Research question, inclusion/exclusion criteria, date or source constraints, and desired result bound.
- Target Zotero library, collection, or current selection when the request includes acquisition.
- External candidate metadata and provenance, plus current authority for import, attachment retrieval, merge, relink, or other write.

## Workflow

### Establish candidate boundary

1. Convert the request into explicit concepts, inclusion and exclusion criteria, date/language/venue/source constraints, desired breadth, stopping rule, and intended outcome: candidate report, import, attachment acquisition, deduplication, or analysis-ready set.
2. Clarify only a choice that would materially change which works qualify, the target library/collection, or the requested write effect.
3. Search the requested external sources and record identifiers, bibliographic facts, provider provenance, search limits, and inclusion rationale. Keep every external result in candidate state.

### Resolve live identity and duplicates

4. Search the current Zotero library for each retained candidate. Compare strong identifiers first, then title, authors, year, venue, edition, translation, preprint, and publication relationships.
5. Read probable live matches and inspect their attachments, collection membership, notes, tags, and readiness facts needed for the acquisition decision. Do not collapse related versions into a duplicate decision.
6. For candidate-only work, return the bounded assessment with unresolved identity or access questions. Do not manufacture a write stage.

### Propose, authorize, and verify

7. For a requested write, present the exact target, candidate set, duplicate effect, metadata source, attachment source, collection effect, expected outputs, and smallest reviewable batch.
8. Choose a described acquisition workflow for provider interaction or reusable multi-step ingest; use a direct semantic operation only when identity and desired effect are already concrete. Validate workflow options and provider profile separately.
9. Execute the current approved scope once. Re-read each acquired item, collection membership, duplicate outcome, or attachment state and keep successful, failed, and unattempted candidates separate.
10. Return `zotero-library-task.result.v1` with candidate provenance or the durable operation/workflow receipt plus live verification.

## Hard constraints

- Do not import, merge, delete, relink, or fetch attachments without current authority and any approval shown in Zotero.
- Treat external discovery results as candidates until identity and duplicate state are checked against the live library.
- Do not make relevance, licensing, or metadata claims that the available source does not support.
- Keep retrieval bounded to the request; do not create a standing watch list or background harvest.
- Do not silently choose a duplicate survivor, target collection, edition, attachment source, or metadata overwrite when alternatives have materially different effects.
- Do not treat a successful search, accepted request, downloaded file, or terminal workflow as proof that a usable Zotero item and attachment now exist.
- Do not replace curated library metadata with conflicting provider metadata without a separately approved curation decision.

## LLM And Tool Responsibilities

The LLM owns search strategy, inclusion judgment, provenance comparison, duplicate assessment, readiness interpretation, and authority checks. The bundled CLI and runner own exact argv, live Zotero calls, workflow and mutation validation, approval transport, handles, and result-schema validation. Do not invent handles, receipts, acquired state, licensing, or duplicate resolution.

## Completion

Return one final `zotero-library-task.result.v1` object with required `schema`, `status`, and `summary`. Use `completed` for a candidate assessment whose declared search boundary is satisfied or for an approved outcome whose item/collection/attachment state is live-verified. Use `canceled` when criteria, target choice, duplicate decision, or write authority is missing, and `failed` when an attempted operation cannot complete safely.

## Failure handling

Preserve candidate provenance, duplicate alternatives, target refs, accepted workflow or operation handles, approval receipts, and structured failures. If acquisition partially succeeds, return successful items separately from failed or unattempted candidates. After denial or ambiguity, stop with the prepared choices; do not switch to a different import, mutation, attachment, or workflow path.

## References

Consult [the comprehensive acquisition playbook](references/playbook.md) when the task needs a detailed search-plan template, identifier/version comparison, duplicate decision record, licensing or provider-boundary analysis, workflow/provider selection, attachment-readiness path, or batch and partial-outcome recovery.
