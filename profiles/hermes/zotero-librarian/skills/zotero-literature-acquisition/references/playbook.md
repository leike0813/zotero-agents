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

## Recovery and near misses

- If a useful candidate is found without write authority, return the report and leave Zotero unchanged.
- If the target collection or library is ambiguous, cancel before import; do not choose the current UI location by convenience.
- If an import succeeds for only part of a batch, verify and return successful item refs, retain failed candidate provenance, and resume only the failed scope.
- If a workflow terminates but expected items or attachments are absent, report the missing deliverable instead of treating run completion as acquisition.
- If attachment access expires, obtain a new handle from the owning item or source; never reuse a guessed storage path.
- If metadata conflicts appear after acquisition, preserve the imported record and route the proposed correction to curation rather than silently repairing it.
- If duplicate effects are broader than the reviewed proposal, stop before mutation and present the newly discovered consequences.
