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

## Natural-language intake

Treat “find,” “collect,” “get,” “import,” and “prepare” as different possible outcomes until the user intent is bounded.

| User wording | Candidate outcome | Material clarification |
| --- | --- | --- |
| “Find some papers about X” | Candidate report | Time window, result bound, source coverage, language, and stopping rule |
| “Find the latest work on X” | Candidate report | Define “latest” with a concrete date window and whether preprints count |
| “Collect research materials about X” | Candidate report or acquisition | Ask whether the user wants citations only, accessible full text, or Zotero imports |
| “Add these papers to my project” | Import and collection assignment | Resolve target library/collection, duplicates, versions, and attachment expectations |
| “Get the PDFs” | Attachment acquisition | Establish lawful source, access boundary, exact items, and acceptable missing files |
| “Deduplicate these results” | Candidate comparison or curation | Determine whether the user wants a report or an approved merge/delete decision |
| “Find papers and summarize them” | Acquisition followed by analysis | Complete and verify the source set before handing it to analysis |

Capture:

- research concepts and synonyms;
- explicit inclusion and exclusion criteria;
- date, language, venue, publication type, and geography constraints;
- external sources or databases to search;
- desired count or evidence-based stopping rule;
- candidate-only, import, attachment-ready, or analysis-ready deliverable;
- target library and collection when a write is requested;
- treatment of preprint/published, translation/original, conference/journal, and duplicate relationships.

Ask when any missing value would materially change the candidate set, target state, provider cost, licensing boundary, or destructive duplicate decision. Do not ask about preferences that do not change the bounded outcome.

Safe defaults:

- produce a candidate report rather than importing;
- preserve external records as candidates until live duplicate checks complete;
- include bibliographic metadata and provenance but do not promise full-text availability;
- use a modest result bound declared to the user;
- preserve distinct versions unless strong evidence establishes duplication.

There is no safe default for target library/collection, duplicate survivor, metadata overwrite, restricted attachment retrieval, merge, delete, or relink. Stop before that effect and obtain a current decision.

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

### Present candidate and write decisions

For candidate-only work, report:

1. Search concepts, sources, date, language, and publication filters.
2. Query limitations and stopping rule.
3. Each retained candidate's strong identifiers, bibliographic facts, provenance, and inclusion rationale.
4. Current Zotero match state: new, probable duplicate, related version, ambiguous, or already present.
5. Attachment/access state when requested.
6. Excluded candidates and material exclusion reasons.

For a write, present one reviewable batch containing:

- exact candidate and target identities;
- proposed metadata source;
- duplicate relationship and survivor choice;
- requested collection effect;
- attachment source and expected readiness;
- items that will remain unchanged;
- workflow or mutation path;
- approval point and post-write verification.

Do not combine unresolved candidates into the approved batch. After execution, classify every candidate as imported and verified, already present and unchanged, failed, unattempted, ambiguous, or awaiting a new decision.

### Acquisition completion checklist

Search boundary:

- Concepts, exclusions, date, language, venue, source, and stopping rule are recorded.
- The report distinguishes searched sources from sources not covered.
- Every retained candidate has provenance and an inclusion reason.
- Result counts do not imply exhaustiveness beyond the declared boundary.

Identity:

- Strong identifiers were compared before fuzzy metadata.
- Probable duplicates were inspected live.
- Related versions remain distinct unless the duplicate decision is supported.
- Existing Zotero items, external candidates, and imported items retain separate identities.

Write preparation:

- Target library and collection are explicit.
- Metadata and attachment sources are known.
- Duplicate effect and survivor choice are reviewable.
- Workflow options and provider profile are validated separately.
- The batch is small enough to inspect and recover.

Verification:

- Each approved item is re-read after the operation.
- Collection membership is confirmed live.
- Required attachment state is inspected rather than inferred from download or run status.
- Failed and unattempted candidates remain in the result.

Near misses:

- Search success is not import success.
- Downloaded bytes are not a Zotero attachment.
- DOI equality can identify a likely duplicate but does not choose the survivor.
- Similar title and year do not prove duplicate identity.
- Provider metadata does not automatically outrank curated library data.
- A terminal workflow does not prove the requested collection or attachment effect.

If the completed result is only a candidate report, say that plainly. Do not phrase it as “collected into Zotero.”

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

## Result contract

Return one business JSON object matching `assets/output.schema.json`.

Required:

- `schema`: `zotero-library-task.result.v1`.
- `status`: `completed`, `canceled`, or `failed`.
- `summary`: describe the candidate boundary or verified acquisition outcome, including counts and material limitations.

Optional:

- `evidence` is an optional array; each entry requires `kind` and `ref`; use it for external provenance, live Zotero matches, acquired item refs, collection refs, attachment refs, workflow runs, or operation receipts. Add `locator` and `description` only when known.
- `artifacts` is an optional array; each entry requires an existing `path` and `role`, such as `candidate-report` or `duplicate-review`; add `mediaType` when known.
- `diagnostics` is an optional array; each entry requires `code` and `message` for unresolved duplicates, inaccessible sources, missing target authority, partial batch outcomes, or another stable limit.

Status rules:

- `completed`: the declared candidate search boundary is satisfied, or every approved acquisition effect is live-verified.
- `canceled`: criteria, target, duplicate choice, attachment authority, or another material decision is missing before the write.
- `failed`: an attempted provider, workflow, import, attachment, or verification path cannot complete the declared objective.

Minimal result:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Prepared a bounded report of twelve candidates, including live duplicate status, without importing any item."
}
```

Do not invent `partial`. When part of an approved batch succeeds but the requested overall acquisition does not, use `failed`, include successful live refs as evidence, and diagnose failed and unattempted candidates.

The Runner's `__SKILL_DONE__` marker is transport metadata, not a field in this business object. Use the pending branch only for a concrete user decision; final output contains no Markdown fence, explanatory prefix, or second JSON object.

## Completion

Return one final `zotero-library-task.result.v1` object with required `schema`, `status`, and `summary`. Use `completed` for a candidate assessment whose declared search boundary is satisfied or for an approved outcome whose item/collection/attachment state is live-verified. Use `canceled` when criteria, target choice, duplicate decision, or write authority is missing, and `failed` when an attempted operation cannot complete safely.

## Failure handling

Preserve candidate provenance, duplicate alternatives, target refs, accepted workflow or operation handles, approval receipts, and structured failures. If acquisition partially succeeds, return successful items separately from failed or unattempted candidates. After denial or ambiguity, stop with the prepared choices; do not switch to a different import, mutation, attachment, or workflow path.

## References

Consult [the comprehensive acquisition playbook](references/playbook.md) when the task needs a detailed search-plan template, identifier/version comparison, duplicate decision record, licensing or provider-boundary analysis, workflow/provider selection, attachment-readiness path, or batch and partial-outcome recovery.
