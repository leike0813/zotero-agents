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

1. Read [the acquisition playbook](references/playbook.md), convert the request into explicit selection criteria, and clarify any missing choice that would materially change the candidate set.
2. Search the requested sources and the current Zotero library. Keep external provenance separate from live Zotero identity and explain why each retained candidate meets the criteria.
3. Inspect likely duplicates, editions, existing attachments, target collection, and readiness before proposing an import, merge, retrieval, or preparation action.
4. For candidate-only work, return the bounded assessment. For a requested write, present the exact target and effect, then execute only the approved operation through the bundled CLI contract.
5. Re-read the acquired item, collection membership, duplicate result, or attachment state. Return `zotero-library-task.result.v1` with candidate evidence or the operation receipt plus live verification.

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

Read [the acquisition playbook](references/playbook.md) before external discovery, duplicate resolution, import or attachment planning, acquisition workflow selection, and partial-outcome recovery.
