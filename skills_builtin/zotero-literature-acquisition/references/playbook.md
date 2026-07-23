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
