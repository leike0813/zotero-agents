# Literature Acquisition Playbook

## Search boundary and candidates

Translate the literature need into a reviewable search plan:

- research concepts and acceptable synonyms;
- inclusion and exclusion criteria;
- publication period, language, venue, document type, or source constraints;
- desired breadth, stopping rule, and ranking preference;
- whether the outcome is a candidate report, Zotero import, attachment acquisition, or analysis-ready set.

Ask for clarification when plausible choices would materially change which works qualify. Otherwise perform a bounded search and state the searched sources and limits. Retain external identifiers such as DOI, ISBN, PMID, arXiv ID, URL, or provider record ID together with enough bibliographic fields to explain inclusion.

External results remain candidates. Search the live Zotero library before saying a work is new or absent. Record provider provenance independently from Zotero item identity so later metadata disagreement remains visible.

## Duplicate and identity checks

Compare candidates using the strongest available identifiers first, then authorship, title normalization, year, venue, edition, and document type. Treat probable matches as alternatives until a live item read confirms the relevant fields. Different editions, translations, versions, preprints, and published articles may be related without being mergeable duplicates.

For every probable duplicate, report:

- each live Zotero ref and external candidate ID;
- matching and conflicting fields;
- attachment, note, collection, tag, relation, and workflow-artifact implications when visible;
- the proposed survivor or coexistence outcome;
- uncertainty that requires a human decision.

A duplicate assessment does not authorize merge, deletion, relinking, or metadata overwrite. If provider metadata conflicts with a curated library field, preserve both sources and route any correction to curation.

## Acquisition and readiness

| Outcome | Required preflight | Completion evidence |
| --- | --- | --- |
| Candidate shortlist | Explicit criteria and current-library comparison | Candidate provenance, rationale, and unresolved identity fields |
| Import known references | Target library/collection, duplicate check, import payload review | Live item refs and collection membership when requested |
| Literature search and ingest | Described workflow, validated selection/options and provider profile | Terminal run plus successfully ingested live items and provenance |
| Attachment acquisition | Current item/attachment/readiness state and permitted source | Live attachment record and verified delivered-file metadata |
| Deduplication | Full records and reviewed survivor effects | Durable receipt plus live post-merge or coexistence state |
| Analysis preparation | Required PDF/Markdown/analysis inputs identified | Verified readiness state for each successful item |

Use readiness reads to identify missing PDFs, source Markdown, or analysis artifacts before selecting remediation. A missing-input list is a diagnostic result, not permission to download or attach. When a local or delivered file is involved, verify its checksum and size, upload through the declared mechanism when required, and confirm the resulting attachment from the parent item.

If full text is unavailable, a candidate assessment can still complete; attachment acquisition cannot. Preserve licensing/access uncertainty and do not claim that a search provider grants a reuse right it did not state.

## Workflow and write authority

Prefer a declared acquisition workflow when the request needs search-provider interaction, multi-step ingest, provenance capture, or reusable business logic. Describe its current requirements and execution modes. For Zotero-managed execution, validate workflow options and provider profile separately, then submit only after the user requested acquisition and the Zotero-side approval path is available.

Use a direct semantic mutation only when the target and desired effect are already concrete, such as importing a reviewed payload or attaching a verified file to a known item. Present the exact target library/collection and duplicate effect. Execute one approved scope and retain its operation or workflow handle.

An explicit provider profile applies only to the current submission. Do not conflate it with the connection profile, silently reuse it for a self-owned handoff, or assume a configured backend is compatible without validation. Default to serial workflow submissions unless the user or an approved policy explicitly permits bounded concurrency.

For a multi-candidate Zotero-managed acquisition, pass the reviewed bounded concurrency to the current workflow submission and let the native Zotero queue own pending-unit ordering and admission. Preserve `submissionId` when the host queues the work, correlate each admitted task with its candidate identity, and use queue cancellation only for a still-pending unit. Do not persist a second candidate queue, reserve entries locally, or replay a unit whose admission outcome is uncertain.

Completion remains candidate-specific: inspect each real run and then verify every successfully ingested Zotero item, provenance record, requested collection membership, and attachment state. Aggregate submission completion does not prove that every candidate was ingested, and a canceled or failed unit must remain visible rather than disappearing from the acquisition report.

## Search-plan templates

Choose the smallest template that exposes the decision boundary:

### Exploratory field scan

```text
question:
concept groups and synonyms:
sources/providers:
date/language/type limits:
ranking preference:
review budget:
stop rule:
output: landscape report | candidate shortlist
```

Use this when vocabulary and canonical works are uncertain. Record which concept group produced each candidate so later narrowing is explainable.

### Targeted evidence search

```text
claim or subquestion:
required study/document characteristics:
must-include and must-exclude signals:
known seed works:
identifier and citation expansion rules:
stop rule:
output: candidate shortlist | reviewed import set
```

Use this when the question is stable and false positives matter more than breadth. A rejected candidate keeps a compact exclusion reason.

### Known-record acquisition

```text
external identifiers or complete citations:
target library and collection:
duplicate policy to review:
required attachments:
metadata source priority:
output: import proposal | analysis-ready set
```

Use this for a finite declared list. Do not add discovery expansion unless the user separately asks for related works.

## Candidate decision records

Maintain one decision record per candidate so search results, Zotero identity, and acquisition outcome remain separable:

```text
candidate_id:
provider_and_query:
bibliographic_identity:
external_identifiers:
inclusion_decision: include | exclude | unresolved
rationale:
live_zotero_matches:
identity_conflicts:
requested_destination:
attachment_expectation:
next_action: report | import-proposal | acquire-file | human-review
```

For an included candidate with a probable Zotero match, keep the candidate and live item refs in the same record but do not collapse them into one identity. For exclusions, store only the fields needed to explain the decision and prevent immediate rediscovery. For unresolved cases, name the missing discriminator—edition, author, year, document type, or identifier—instead of assigning a confidence score without a decision consequence.

Batch summaries should derive from these records: included-new, included-existing, excluded, unresolved, imported, attached, and failed. The summary never replaces the per-candidate provenance needed for a retry or duplicate review.

## Batch and partial-outcome matrix

| Observed batch state | Stable completed scope | Residual scope | Safe next action |
| --- | --- | --- | --- |
| Search completed; no writes requested | Reviewed candidate records | Unresolved candidates only | Ask for missing discriminators or finish with limitations |
| Some candidates already exist | Confirmed live matches | New and ambiguous candidates | Exclude existing items from import; review ambiguous records |
| Import partially succeeded | Live-verified new item refs | Failed or unverified candidate IDs | Rebuild a residual proposal from current state |
| Items imported but collection placement failed | Verified item creation | Missing memberships | Propose only the collection delta |
| Attachment acquisition partially succeeded | Verified child attachment refs | Items still missing required files | Re-read readiness and retry only missing files |
| Workflow terminal but outputs are missing | Run receipt and any live results found | Promised items, attachments, or provenance | Preserve diagnostics; do not resubmit until duplication risk is resolved |
| User or Zotero denies a write | Candidate report and preflight remain valid | Entire denied mutation scope | Return report; require a new request before another write |

A residual batch gets a new preflight when target collections, duplicate state, provider inputs, or expected effects changed. Preserve successful live identities even when a later stage fails, because rerunning the original batch can create duplicates or duplicate attachments.

## Recovery and near misses

- If a useful candidate is found without write authority, return the report and leave Zotero unchanged.
- If the target collection or library is ambiguous, cancel before import; do not choose the current UI location by convenience.
- If an import succeeds for only part of a batch, verify and return successful item refs, retain failed candidate provenance, and resume only the failed scope.
- If a workflow terminates but expected items or attachments are absent, report the missing deliverable instead of treating run completion as acquisition.
- If attachment access expires, obtain a new handle from the owning item or source; never reuse a guessed storage path.
- If metadata conflicts appear after acquisition, preserve the imported record and route the proposed correction to curation rather than silently repairing it.
- If duplicate effects are broader than the reviewed proposal, stop before mutation and present the newly discovered consequences.
## End-to-end decision traces

These traces demonstrate how a bounded acquisition request moves from human wording to candidates, live duplicate decisions, authority, and verification.

### Trace 1: “Find recent papers on X”

User utterance:

> Find some recent papers on retrieval-augmented scientific agents.

Ambiguities:

- “recent” has no date window;
- “some” has no result bound;
- external sources and language are unspecified;
- the user has not asked for import;
- preprints and published versions may overlap.

Clarification/default:

Ask for a date window when recency materially controls inclusion. If the user accepts defaults, disclose a concrete window, result cap, language policy, searched sources, and candidate-only outcome.

Candidate plan:

1. Expand the research concept into declared search terms.
2. Search the named sources.
3. Record query limits and provider provenance.
4. Retain candidates meeting the inclusion rule.
5. Compare strong identifiers and versions.
6. Search the live Zotero library for every retained candidate.
7. Label each new, existing, probable duplicate, related version, or ambiguous.

Do not:

- import because the user said “find”;
- hide unavailable full text;
- call a preprint and journal article duplicates without a version decision;
- describe the result as exhaustive beyond the declared sources and stopping rule.

Human-facing result:

> I prepared twelve candidates from the declared 2024–2026 window and sources. Four already exist in the current Zotero library, two are related preprint/published pairs, and six appear new. Nothing has been imported.

Completed result:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Prepared twelve bounded candidates with provenance and current Zotero duplicate status; no item was imported.",
  "artifacts": [
    {
      "path": "/workspace/candidate-report.md",
      "role": "candidate-report",
      "mediaType": "text/markdown"
    }
  ]
}
```

### Trace 2: Import a reviewed batch into a collection

User utterance:

> Add these papers to my “Agent Research” collection and get the PDFs where possible.

Resolved inputs:

- exact candidate records;
- target library and collection identity;
- duplicate alternatives;
- metadata provenance;
- lawful attachment sources;
- smallest reviewable batch.

Proposal per candidate:

- strong identifiers and bibliographic version;
- current Zotero match;
- import versus reuse decision;
- collection membership effect;
- attachment source and expected readiness;
- metadata conflicts;
- unmodified fields;
- approval and verification path.

Authority:

1. Show the exact batch.
2. Obtain current authority for import and collection changes.
3. Keep merge, overwrite, delete, and relink outside the batch unless separately approved.
4. Validate workflow options and provider profile if a workflow is used.

Execution:

1. Submit or apply the approved batch once.
2. Preserve operation/workflow handles.
3. Re-read every resulting item.
4. Verify collection membership.
5. Inspect attachment state separately.
6. Classify successful, existing, failed, unattempted, and ambiguous candidates.

Partial outcome:

- Seven items are imported or reused and live-verified.
- One provider request fails before item creation.
- Two PDFs are unavailable.

Result decision:

- The requested overall batch did not completely succeed, so use `failed`.
- Preserve the seven successful item refs.
- Diagnose the one failed acquisition and two attachment gaps.
- Do not replay the whole batch.

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "failed",
  "summary": "Verified seven of eight requested items in the target collection; one acquisition failed and two verified items still lack requested attachments.",
  "evidence": [
    {
      "kind": "collection",
      "ref": {
        "libraryId": 1,
        "key": "COLLECT1"
      },
      "description": "Target collection re-read after the approved batch."
    }
  ],
  "diagnostics": [
    {
      "code": "residual_acquisition",
      "message": "One candidate was not created and two attachment requests remain unavailable."
    }
  ]
}
```

Recovery:

- Prepare a residual proposal for the failed candidate only.
- Treat missing attachments as distinct from missing bibliographic items.
- Obtain new authority if a different source or metadata overwrite is proposed.

### Trace 3: Duplicate ambiguity after provider discovery

User utterance:

> Import the best version and remove the duplicate.

Observed candidates:

- one conference paper already in Zotero with annotations;
- one journal extension from the provider;
- similar title and overlapping authors;
- distinct DOI and additional experiments.

Decision:

- These may be related versions rather than duplicates.
- “Best” is a user preference, not an identity fact.
- Removing the existing item is destructive and may affect annotations, collections, relations, and attachments.

Clarification:

> The library item and provider result appear to be conference and journal versions with different identifiers. Do you want to keep both, import the journal version and link them, or review a destructive merge/removal proposal?

Canceled result when no decision is supplied:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "canceled",
  "summary": "Stopped before import or removal because the two records are related versions and no survivor or linking decision was provided.",
  "evidence": [
    {
      "kind": "zotero-item",
      "ref": {
        "libraryId": 1,
        "key": "CONF2024"
      },
      "description": "Existing annotated conference version."
    }
  ],
  "diagnostics": [
    {
      "code": "version_decision_required",
      "message": "Choose whether to keep, link, or separately review destructive consolidation."
    }
  ]
}
```

Unsafe alternatives:

- choosing the journal version because it is newer;
- deleting the conference record before preserving annotations;
- overwriting curated metadata from provider fields;
- treating title similarity as duplicate proof.

Resume:

- Re-read both identities and affected children after the user decides.
- Route destructive consolidation to a curation proposal.

## Conversation and record patterns

Candidate report language:

> The search covered the declared sources and stopped at the agreed bound. The report separates external candidates, current Zotero matches, related versions, and unresolved identities.

Write proposal language:

> This batch will create six items, reuse three existing items, add all nine to the named collection, and attempt attachments from the listed sources. It will not merge, delete, or overwrite conflicting curated metadata.

Attachment limitation language:

> The bibliographic item is live-verified, but no usable attachment was acquired. I have not labeled it analysis-ready.

Residual recovery language:

> The first batch created five items. The residual proposal contains only the two failed candidates and does not replay verified successes.

Every candidate decision record should preserve:

- external identifier and provenance;
- searched source and query boundary;
- inclusion reason;
- live Zotero candidates;
- duplicate/version judgment;
- target effect;
- attachment state;
- authority state;
- final live verification or diagnostic.

Do not collapse “already present,” “newly imported,” “related version,” and “failed acquisition” into one acquired count.
