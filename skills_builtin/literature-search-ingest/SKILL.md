---
name: literature-search-ingest
description: Conduct guided literature search with multilingual and topic expansion, seed-paper expansion, targeted record ingest, candidate review, evidence-backed metadata and public-PDF verification, and typed Zotero ingest through zotero-bridge. Use when a user wants to discover scholarly literature, fill a Zotero or Synthesis coverage gap, expand from a known paper, verify and ingest an exact record, review candidates before mutation, or add approved literature with provenance to Zotero.
---

# Literature Search Ingest

## Mission

Turn a research question, topic, seed paper, or exact bibliographic clue into a reviewed set of traceable literature records, then ingest only the user-approved direct works into Zotero.

This Skill runs only as an ACP interactive SkillRunner workflow. Use legitimate public discovery sources and `zotero-bridge` for read-only Zotero/Synthesis context and approved Zotero mutation. Do not use browser automation, Zotero Connector, CDP, login sessions, institutional proxies, CAPTCHA bypass, Sci-Hub, LibGen, or other pirated sources.

## When To Use

Use this Skill for:

- guided literature-search planning when the research goal is incomplete;
- multilingual or topic-based discovery that must cover local-library gaps;
- expansion from a known paper, Topic, digest, reference list, or citation analysis;
- exact-record verification and targeted Zotero ingest;
- candidate review followed by metadata, public-PDF, and typed-ingest gates.

## Do Not Use

Do not use this Skill for:

- editing metadata on an already selected Zotero item without discovery;
- analyzing, translating, drafting from, or synthesizing already selected papers;
- bulk migration between Zotero instances;
- automatic background ingest without user review;
- importing a bare title, search snippet, or identity-conflicted record.

## Inputs

Read runner input from `runtime/input.json`; do not reconstruct it from conversation memory.

- `query`: string; default `""`. It may be a research question, topic/knowledge gap, seed-paper clue, or exact title/identifier. Whitespace-only is blank.
- `searchMode`: exactly `auto`, `guided`, `topic_expansion`, `paper_seed_expansion`, or `targeted_ingest`; default `auto`.
- `searchBreadth`: exactly `broad`, `balanced`, or `quick`; default `broad`. Breadth controls query/source coverage, not candidate-quality thresholds.
- `languageHints`: optional BCP 47-style strings such as `en`, `zh-CN`, or `ja`; default `[]`. Hints add query and source coverage and never exclude unlisted languages.
- `targetCollection`: optional Zotero collection ref. An empty value means the user's default library; never guess a collection.

The four supported query forms are:

1. blank or incomplete research intent;
2. topic, question, method, object, application, or coverage gap;
3. known paper, author, project, dataset, Topic, or local artifact;
4. exact bibliographic record or identifier.

## Interactive Contract

Only two stages may wait for the user:

1. Stage 10: approve or cancel the Search Brief.
2. Stage 30: approve the ingest scope, request another discovery round, or cancel.

Apply these rules:

- Ask only for missing information that changes the search plan. State what is missing and how it affects discovery.
- Treat non-empty `query` and read-only local context as known facts; do not repeat questions they already answer.
- Allow “unknown” or “no preference.” Stop intake as soon as a minimum research goal exists.
- Do not perform external discovery, download files, or mutate Zotero before Stage 10 approval, including non-blank `auto`.
- Stage 30 expansion remains the same ingest-scope decision. It returns to Stage 20 with the next `discovery_round` and then returns to Stage 30; it does not create a third decision stage.
- Progress messages are ordinary assistant updates. They must not enter a waiting state and must not resemble final JSON.
- After Stage 30 scope approval, metadata resolution, three-route PDF probing, payload preparation, and per-paper ingest run automatically. Never ask for another confirmation or use `open_text`.
- A non-blocking final-preparation table is allowed after scope approval, but it must not pause execution.
- Return a completed or canceled JSON object only after the gate returns `return_final_output`. Never return pending, a receipt, a plan summary, or a progress placeholder as final output.

## Runtime Model

Run from the runner workspace. Never change into the Skill package directory.

Authoritative runtime paths:

- runner input: `runtime/input.json`;
- JSON gate state: `runtime/literature-search-ingest-gate.json`;
- agent-authored stage payloads: the current gate `payload_path` under `runtime/payloads/`;
- runtime-generated immutable ingest payloads: `runtime/payloads/ingest-paper-NNN.json`;
- Host receipt wrappers: the current gate `receipt_path` under `runtime/host/`;
- compact audit summary: `result/search-ledger.json`;
- final business output: the single assistant JSON validated by `assets/output.schema.json`.

The JSON gate state is the execution source of truth. It stores stage status, discovery round, decisions, candidate ids, payload paths and hashes, prepared payload hashes, and receipt indexes. Stage payloads hold detailed semantic evidence. `result/search-ledger.json` is a compact audit summary and must never be used to infer or advance state.

`scripts/gate_runtime.py` is the only agent-facing runtime entrypoint. `scripts/stage_runtime.py` validates and mutates state behind that entrypoint. `assets/runtime-action.schema.json` is the structural contract for every agent-authored action payload. The runner owns `result/result.json`; do not hand-write it.

## Gate Discipline

Replace `<absolute-skill-package>` with the absolute directory containing this file. The first command, every resume command, and the command after every state change is:

```bash
python "<absolute-skill-package>/scripts/gate_runtime.py" \
  --state "runtime/literature-search-ingest-gate.json" \
  --input "runtime/input.json"
```

The gate is the only next-step authority. Copy its absolute paths and commands exactly.

Valid `next_action` values are:

| `next_action` | Required behavior |
| --- | --- |
| `await_user_input` | Read `required_reads`, present the current decision, wait for a real user response, write one allowed action to `payload_path`, run `submit_command`, then rerun the initial gate. |
| `submit_stage_payload` | Perform the semantic work for the returned stage/candidate/round, write only `payload_path` against `payload_schema`, run `submit_command`, then rerun the initial gate. |
| `run_stage` | Execute `command` exactly, do not edit generated files, then rerun the initial gate. |
| `execute_ingest` | Execute the one-paper mutation `command`, write the bound Host receipt wrapper to `receipt_path`, run `submit_command`, then rerun the initial gate. |
| `blocked` | Stop state changes. Report the blocker and follow only a gate-issued repair path. |
| `return_final_output` | Read the terminal state and required recovery/output reference, write the compact ledger, and emit exactly one completed or canceled JSON object. |

Use `allowed_actions` as an exhaustive list, not a suggestion. Current action routing is:

- Stage 10: `approve_search_plan`, `cancel_workflow`.
- Stage 20: `record_discovery`.
- Stage 30: `approve_ingest_scope`, `request_discovery_expansion`, `cancel_workflow`.
- Stage 40: `record_metadata`.
- Stage 50: `record_pdf_probe`.
- Stage 60: `run_stage`.
- Stage 70: `execute_ingest`, then `record_ingest_receipt`.
- Terminal: `return_final_output`.

Every state-changing command is followed by the initial gate command, even if the mutation command also prints a refreshed gate. Command stdout is a runtime receipt, not final assistant output.

If payload validation fails:

1. do not claim the stage completed;
2. rerun the initial gate;
3. repair only the current `payload_path`;
4. resubmit the current action;
5. rerun the initial gate again.

If the gate returns a blocker, do not edit state, payload hashes, generated ingest payloads, Host receipts, or another stage's payload. After context loss, process restart, or compaction, rerun the initial gate, read `resume_packet`, read only the current `required_reads`, and execute only the returned `next_action`.

## Mode Routing

Determine the effective mode while preparing Stage 10:

| Input | Effective routing |
| --- | --- |
| Blank `query` + `auto` | Enter `guided`; collect the minimum research goal. |
| Non-blank `query` + `auto` | Use the query and read-only local coverage to recommend one effective mode in the Search Brief; do not perform external discovery first. |
| Explicit `guided` | Keep `guided`; ask only unresolved plan-changing questions. |
| Explicit `topic_expansion` | Keep the mode; require the topic/question/gap needed to plan discovery. |
| Explicit `paper_seed_expansion` | Keep the mode; identify the seed and read available local seed artifacts before planning external discovery. |
| Explicit `targeted_ingest` | Keep the mode; identify exactly one requested direct work and do not recommend related literature. |

Once a guided Search Brief is approved, keep `search_mode: "guided"` through final output. Never remap an explicit mode.

### Guided intake

Collect only relevant unknowns among:

- research question, discipline, application, target knowledge gap;
- period, literature type, population/object, method, region, and language preferences;
- known papers, authors, projects, datasets, Topics, and local artifacts;
- inclusion/exclusion criteria and adjacent topics to avoid;
- desired review batch size, depth, and recall-versus-speed preference.

### Local coverage and seed artifacts

Before presenting the Search Brief, inspect Zotero/Synthesis read-only with:

- `zotero-bridge synthesis topic list`;
- `zotero-bridge synthesis index library get`;
- bounded library search/get commands when needed;
- `zotero-bridge synthesis artifact read` for a selected seed's references, citation analysis, digest, or Topic report.

Summarize covered topics, years, methods, literature types, languages, exact/possible duplicates, reusable seeds, and structural gaps. `paper_seed_expansion` uses available seed artifacts before external discovery; if none is available, plan from the seed's original title, creators, year, identifiers, and container.

### Search Brief

The Stage 10 plan must contain:

- effective mode, objective, discipline/application, and search breadth;
- date, language, literature-type, region, inclusion, and exclusion scope;
- local coverage, exact/possible duplicates, reusable seed refs, gaps, and seed-artifact use;
- planned core, multilingual, seed, and gap queries, including original-script, translated, simplified/traditional, and English variants when applicable;
- primary, supplemental, and fallback source lanes with their roles;
- candidate tiers, material-conflict policy, review batch size, and duplicate policy;
- three-route public-PDF policy;
- concrete stop conditions.

## High-recall Search

### Query lanes

Use the applicable lanes in each discovery round and record every actual attempt:

| Lane | Purpose | Typical query forms |
| --- | --- | --- |
| `core` | Cover the research question's main expression. | concept combinations, quoted titles, method + object, application + outcome |
| `multilingual` | Find original-language and regional records. | original terms, published translations, romanization, simplified/traditional variants, regional terminology |
| `seed` | Expand from known works or entities. | creators, references, citations, similar works, projects, datasets |
| `gap` | Fill structural omissions in accumulated candidates. | missing period, method, region, language, literature type, population, or local-library gap |

Preserve original text in queries and candidates. Translation, transliteration, and romanization generate retrieval and matching variants only; they never replace the original title, creators, journal, conference, university, institution, or publisher.

### Source composition

Choose sources by discipline, language, region, and literature type:

- cross-disciplinary indexes: Crossref, OpenAlex, Semantic Scholar, Google Scholar, or equivalent public scholarly indexes;
- authoritative publication sources: DOI landing pages, publishers, journals, conferences, authors, laboratories, projects;
- domain indexes: PubMed, Europe PMC, arXiv, and task-relevant databases;
- long-tail sources: institutional repositories, thesis repositories, library catalogs, reference lists, and citation networks;
- mainland Chinese sources: China DOI, publicly accessible CNKI/Wanfang metadata, PDC, official journals/conferences/publishers, degree institutions, repositories;
- traditional-Chinese and regional sources: Airiti Library, TSSCI, Taiwan thesis repositories, journal sites, university repositories, library catalogs.

For Chinese journal/conference work, prioritize China DOI and official venue records; for theses, prioritize degree-granting institutions and thesis repositories; for books/ISBNs, prioritize publishers and library catalogs. A source failure is a coverage gap, not proof that the work does not exist. Record the failure and try a same-class fallback.

### Breadth and stop conditions

- `broad`: execute every applicable lane; for every key language/region use at least one index and one authoritative or long-tail source; stop only when new-source and gap queries no longer yield new high-relevance works.
- `balanced`: execute core plus applicable multilingual/seed lanes, then one gap round; stop when productive sources repeatedly yield duplicates and structural gaps are covered.
- `quick`: execute core plus the most relevant multilingual or seed lane; return a first-pass candidate set and do not claim exhaustive coverage.

Candidate count is a presentation limit, never a discovery stop condition. Each round records actual queries, sources, source failures, source-record count, unique count, merges, unresolved conflicts, uncovered gaps, and a concrete stop reason.

### Identity, deduplication, and versions

- A strong identity key is a normalized DOI, PMID, arXiv id, ISBN, or equivalent exact identifier.
- A weak identity key combines Unicode-normalized original title, year, first creator/organization, and container. It supports clustering only.
- Discovery evidence preserves source, URL, query lane, original source title, reasons, and observed facts.
- Matching evidence records exact identifier agreement or title/creator/year/container agreement.

Merge obvious same-work source records by strong key first. With no strong key, cluster by the original-script weak key; never translate non-Latin text before deduplication. Merging accumulates evidence and never overwrites original bibliographic values. Keep material conflicts separate. Record journal/preprint, conference/journal, edition, thesis/article, and container/direct-work relationships explicitly until authoritative evidence resolves them.

## Candidate Tiers And Review

- `ready`: identifiers or authoritative metadata can support a semantically clear typed ingest.
- `needs_curation`: the source is traceable and the closest safe Zotero type is known, but fields, conflicts, or creator completeness still require later curation; ingest with `needsCuration: true` in the final outcome.
- `lead_only`: a snippet, bare title, or unresolved conflict that may drive another query but cannot be ingested.

Do not exclude a traceable work solely because it is non-English, lacks an English translation or DOI, or has no public PDF. Only `lead_only` is non-ingestible for insufficient identity/metadata.

Present candidates in readable batches without limiting how many the user may select. Each row includes:

- candidate id, original title, alternate title, creators, year, container, original language, and tier;
- identifiers with `resolved` or `identifier_not_found`;
- discovery and metadata source roles, authoritative landing URL, and matching basis;
- library duplicate/version relationship and material conflicts;
- PDF attempt/status known at that point;
- missing fields, recommendation reason, and whether it is ingestible.

Mark `lead_only` as non-ingestible and explain which next query it can support. At Stage 30 the user may approve any number of ingestible candidates, request a focused expansion, or cancel.

## Stage Contracts

For every stage, first run the initial gate and use its returned paths and commands. The examples below show minimum semantics; `assets/runtime-action.schema.json` is the exact field and enum contract.

### Stage 10 — Search Plan

**Purpose:** Convert user intent and read-only local coverage into an executable Search Brief and obtain the first user decision.

**Agent semantic responsibility:** Route the mode, perform focused intake, inspect local coverage, design query/source lanes, explain scope and stop conditions, and present the plan. If the user requests changes, revise and present it again. Submit only after explicit approval, or submit cancellation.

**Runtime responsibility:** Validate the plan structure, lock its hash, or record a user cancellation. It does not design queries or infer approval.

**Gate command:**

```bash
python "<absolute-skill-package>/scripts/gate_runtime.py" \
  --state "runtime/literature-search-ingest-gate.json" \
  --input "runtime/input.json"
```

**Payload path:** The gate returns `runtime/payloads/search-plan-decision.json`.

**Minimal payload:**

```json
{
  "action": "approve_search_plan",
  "approved": true,
  "plan": {
    "search_mode": "guided",
    "objective": "Find research on tunnel-lining defect recognition",
    "discipline_or_application": "civil infrastructure inspection",
    "scope": {
      "date_range": "2018-present",
      "language_hints": ["zh-CN", "en"],
      "literature_types": ["journalArticle", "thesis"],
      "regions": ["China"]
    },
    "local_coverage": {
      "summary": "The library covers generic vision inspection but not tunnel linings.",
      "existing_identifiers": [],
      "reusable_seed_refs": [],
      "gaps": ["Chinese theses and engineering deployments"]
    },
    "seed_artifacts": [],
    "query_lanes": [
      {
        "lane": "core",
        "queries": ["隧道衬砌 病害 智能识别"],
        "rationale": "Combines target, defect, and method."
      }
    ],
    "source_lanes": [
      {
        "source": "China DOI",
        "source_class": "regional_index",
        "role": "primary",
        "fallback_sources": ["Crossref"]
      }
    ],
    "inclusion_criteria": ["Directly studies tunnel-lining defects"],
    "exclusion_criteria": ["Generic detection with no tunnel setting"],
    "candidate_policy": {
      "tiers": ["ready", "needs_curation", "lead_only"],
      "material_conflict": "keep_separate",
      "batch_size": 20
    },
    "breadth": "balanced",
    "stop_conditions": ["Applicable sources no longer yield new relevant works"],
    "pdf_policy": "three_route_public_identity_matched"
  }
}
```

Cancellation uses:

```json
{
  "action": "cancel_workflow",
  "reason": "user_cancelled",
  "message": "The user canceled search planning."
}
```

**Submit/run/mutation command:** Write the chosen action to `payload_path`, execute the gate `submit_command`, then rerun the initial gate.

**Completion:** An approved plan hash exists, or the gate returns canceled terminal state.

**Forbidden:** No external discovery, file download, candidate claims, or Zotero mutation before approval. Do not submit a revision as approval.

**Recovery:** Rerun the initial gate. Repair only `search-plan-decision.json`; exact replay is idempotent and different replay fails.

**Next:** Stage 20 after approval; terminal after cancellation.

### Stage 20 — Discovery Round

**Purpose:** Execute the approved search plan or Stage 30 gap requests and maintain one cumulative deduplicated candidate set.

**Agent semantic responsibility:** Run actual public queries, record source failures, preserve original text, deduplicate same-work records, keep material conflicts separate, tier candidates, and explain the stop reason.

**Runtime responsibility:** Require the current `discovery_round`, validate attempts/candidates, reject duplicate ids, reject disappearance of earlier candidates or evidence, and store the round payload hash and summary.

**Gate command:** Run the initial gate; confirm `next_action: "submit_stage_payload"` and the returned round.

**Payload path:** `runtime/payloads/discovery-round-NNN.json`, issued by the gate.

**Minimal payload:**

```json
{
  "action": "record_discovery",
  "discovery_round": 1,
  "query_attempts": [
    {
      "lane": "core",
      "query": "隧道衬砌 病害 智能识别",
      "source": "China DOI",
      "status": "completed",
      "result_count": 1
    }
  ],
  "candidates": [
    {
      "candidate_id": "doi:10.5555/tunnel.001",
      "tier": "ready",
      "title": "隧道衬砌病害智能识别研究",
      "alternate_titles": [],
      "creators_display": ["张三"],
      "year": "2024",
      "container": "隧道工程学报",
      "original_language": "zh-CN",
      "material_version": "journal_article",
      "identifiers": { "doi": "10.5555/tunnel.001" },
      "identity": {
        "strong_keys": ["doi:10.5555/tunnel.001"],
        "weak_key": "隧道衬砌病害智能识别研究|2024|张三"
      },
      "discovery_sources": [
        {
          "source": "China DOI",
          "url": "https://example.org/record/tunnel-001",
          "source_role": "index",
          "query_lane": "core",
          "raw_title": "隧道衬砌病害智能识别研究",
          "reason": "The record exposes the original title and year.",
          "facts": ["original_title", "publication_year"]
        }
      ],
      "matching_evidence": [
        {
          "field": "title",
          "value": "隧道衬砌病害智能识别研究",
          "source": "China DOI"
        }
      ],
      "landing_url": "https://example.org/record/tunnel-001",
      "duplicate_status": "not_in_library",
      "missing_fields": [],
      "recommendation_reason": "Directly addresses the approved research target."
    }
  ],
  "uncovered_gaps": [],
  "source_failures": [],
  "deduplication_summary": {
    "source_record_count": 1,
    "unique_candidate_count": 1,
    "merged_record_count": 0,
    "unresolved_conflict_count": 0
  },
  "stop_reason": "all_applicable_lanes_completed"
}
```

An empty `candidates` array is valid when attempts and the no-result stop reason are honest. A later round submits the full accumulated candidate set, not only new results.

**Submit/run/mutation command:** Execute the returned `submit_command`, then rerun the initial gate.

**Completion:** The current round has actual attempts, a cumulative candidate set, deduplication summary, failures/gaps, and stop reason.

**Forbidden:** Do not mutate Zotero, drop prior candidates/evidence, merge material conflicts, translate before deduplication, or claim source unavailability proves absence.

**Recovery:** Rerun the gate and resubmit the same round. Exact retry is idempotent; changed retry and stale/future round fail.

**Next:** Stage 30.

### Stage 30 — Ingest Scope

**Purpose:** Obtain the second and final user decision over the cumulative candidate set.

**Agent semantic responsibility:** Present candidate/exclusion tables and disclose that approved direct works will be resolved, probed, prepared, and ingested automatically. Interpret the response as approval, a focused gap request, or cancellation.

**Runtime responsibility:** Validate ids against the current round, reject `lead_only`, lock approved ids, increment the round for expansion, or record cancellation.

**Gate command:** Run the initial gate and confirm `next_action: "await_user_input"` plus `allowed_actions`.

**Payload path:** `runtime/payloads/ingest-scope-decision-round-NNN.json`.

**Minimal payload:**

```json
{
  "action": "approve_ingest_scope",
  "approved": true,
  "discovery_round": 1,
  "candidate_ids": ["doi:10.5555/tunnel.001"],
  "excluded_candidate_ids": [],
  "authorization_notice_acknowledged": true
}
```

Expansion uses:

```json
{
  "action": "request_discovery_expansion",
  "discovery_round": 1,
  "gap_requests": [
    {
      "gap_type": "literature_type",
      "description": "Add Chinese doctoral theses.",
      "requested_lanes": ["multilingual", "gap"]
    }
  ]
}
```

Cancellation uses the Stage 10 `cancel_workflow` shape.

**Submit/run/mutation command:** Execute the returned `submit_command`, then rerun the initial gate.

**Completion:** The scope is locked, an expansion round is created, or cancellation is terminal.

**Forbidden:** Do not approve unknown or `lead_only` ids. Do not turn expansion into a separate confirmation stage. After approval, do not wait again.

**Recovery:** Rerun the gate. If expansion was accepted, use the new round/path and include all accumulated candidates in Stage 20.

**Next:** Stage 40 after approval; Stage 20 after expansion; terminal after cancellation.

### Stage 40 — Metadata Resolution

**Purpose:** Resolve every approved candidate to the same direct bibliographic work with authoritative, original-script, Zotero-compatible metadata.

**Agent semantic responsibility:** Search identifier-first, then title-path sources; judge direct-work identity, version/container relationships, original publication language, field evidence, creator completeness, and curation needs. If the approved identity changes or evidence is insufficient, record `not_attempted`; never substitute another work.

**Runtime responsibility:** Enforce candidate order, source/evidence structure, exact identifier or title-path acceptance, authoritative landing evidence, original-title roles, complete-or-empty creators, DOI placement, warnings, and terminal `qualified`/`not_attempted`.

**Gate command:** Run the initial gate and process only its `candidate_id`.

**Payload path:** `runtime/payloads/metadata-NNN.json`.

**Minimal payload — qualified:**

```json
{
  "action": "record_metadata",
  "candidate_id": "doi:10.5555/tunnel.001",
  "status": "qualified",
  "identifier_status": "resolved",
  "checked_sources": ["China DOI", "Official journal landing"],
  "match": {
    "method": "identifier",
    "direct_work": true,
    "material_conflict": false,
    "normalized_identifier": {
      "type": "DOI",
      "value": "10.5555/tunnel.001"
    }
  },
  "metadata": {
    "itemType": "journalArticle",
    "originalTitle": {
      "value": "隧道衬砌病害智能识别研究",
      "language": "zh-CN",
      "script": "Hans"
    },
    "alternateTitles": [
      {
        "value": "Intelligent Recognition of Tunnel Lining Defects",
        "role": "translated",
        "language": "en",
        "script": "Latn"
      }
    ],
    "language": "zh-CN",
    "script": "Hans",
    "creatorCompleteness": "incomplete",
    "fields": {
      "title": "隧道衬砌病害智能识别研究",
      "date": "2024",
      "publicationTitle": "隧道工程学报",
      "language": "zh-CN"
    },
    "creators": [],
    "identifiers": { "doi": "10.5555/tunnel.001" },
    "containers": [
      { "role": "journal", "title": "隧道工程学报" }
    ],
    "landingUrl": "https://doi.org/10.5555/tunnel.001"
  },
  "evidence": [
    {
      "source": "China DOI",
      "url": "https://doi.org/10.5555/tunnel.001",
      "source_role": "authoritative",
      "identifier": "10.5555/tunnel.001",
      "reason": "The DOI and original Chinese title identify the same direct work.",
      "facts": ["identifier", "original_title", "publication_year"]
    }
  ],
  "warnings": [
    {
      "code": "native_creator_names_unverified",
      "message": "The complete Chinese creator list was not verified."
    }
  ],
  "needs_curation": true
}
```

For `match.method: "title"`, omit `normalized_identifier` and add at least two unique `corroborating_signals`.

**Minimal payload — not attempted:**

```json
{
  "action": "record_metadata",
  "candidate_id": "source:uncertain-002",
  "status": "not_attempted",
  "reason_code": "material_conflict_unresolved",
  "reason": "The available sources disagree on whether the record is the thesis or later article.",
  "checked_sources": ["University repository", "Publisher index"],
  "evidence": [],
  "warnings": []
}
```

**Submit/run/mutation command:** Execute the returned `submit_command`, rerun the gate, and continue until all approved candidates have terminal metadata status.

**Completion:** Every approved candidate is `qualified` or `not_attempted`.

**Forbidden:** Do not use a translated title as primary title; write partial creator replacement lists; guess item type; use a container as the direct work; place DOI in `fields.DOI` or `fields.extra`; or ask the user for a replacement work.

**Recovery:** Repair only the current metadata payload. If authoritative identity cannot be established, submit `not_attempted` with a stable reason and continue.

**Next:** Stage 40 for another candidate; otherwise Stage 50 for qualified candidates.

### Stage 50 — Public PDF Probe

**Purpose:** Complete three independent, legal public-PDF route families for every metadata-qualified candidate.

**Agent semantic responsibility:** Search each route, inspect reachability/content type, distinguish landing pages from PDFs, judge same-direct-work identity, and record the actual outcome.

**Runtime responsibility:** Require exactly one terminal attempt for `authoritative_landing`, `open_access`, and `web_search`; validate enums and found-file conditions; choose the first valid route by fixed route order; allow metadata ingest when all routes are exhausted without a PDF.

**Gate command:** Run the initial gate and confirm the returned `candidate_id` and `required_pdf_routes`.

**Payload path:** `runtime/payloads/pdf-probe-NNN.json`.

**Minimal payload:**

```json
{
  "action": "record_pdf_probe",
  "candidate_id": "doi:10.5555/tunnel.001",
  "attempts": [
    {
      "route": "authoritative_landing",
      "source": "DOI landing page",
      "query_or_url": "https://doi.org/10.5555/tunnel.001",
      "status": "not_found",
      "identity_match": true,
      "legal_source": true,
      "reachable": true
    },
    {
      "route": "open_access",
      "source": "OA indexes and repositories",
      "query_or_url": "10.5555/tunnel.001",
      "status": "not_found",
      "identity_match": false,
      "legal_source": true,
      "reachable": true
    },
    {
      "route": "web_search",
      "source": "Public web search",
      "query_or_url": "\"隧道衬砌病害智能识别研究\" filetype:pdf",
      "status": "not_found",
      "identity_match": false,
      "legal_source": true,
      "reachable": true
    }
  ]
}
```

A found attempt additionally requires `status: "found"`, `identity_match: true`, `legal_source: true`, `reachable: true`, an HTTP(S) `pdf_url`, and `content_type` beginning with `application/pdf`.

**Submit/run/mutation command:** Execute the returned `submit_command`, rerun the gate, and continue through all qualified candidates.

**Completion:** Each qualified candidate has all three route outcomes and a derived PDF status of found or missing.

**Forbidden:** Do not count an unattempted route, login/paywall page, search result, HTML landing page, inaccessible URL, illegal source, or wrong-work PDF as found.

**Recovery:** Repair the missing or invalid route in the current payload. `not_found`, `restricted`, `unavailable`, `mismatch`, and `error` are terminal attempts; omission is not.

**Next:** Stage 50 for another candidate; otherwise Stage 60.

### Stage 60 — Ingest Preparation

**Purpose:** Deterministically generate one immutable typed Zotero payload per metadata-qualified candidate.

**Agent semantic responsibility:** Review the gate's readiness only. A non-blocking summary table may show title, creators, identifier, and PDF status; do not author or modify ingest payloads.

**Runtime responsibility:** Rehash accepted metadata and PDF payloads, reject tampering, map evidence-backed fields into one-paper typed payloads, write stable numbered files, and bind each file hash to its candidate.

**Gate command:** Run the initial gate and execute its `command` exactly when `next_action` is `run_stage`.

**Payload path:** Runtime-generated `runtime/payloads/ingest-paper-NNN.json`. There is no agent-authored stage payload.

**Minimal payload generated by the runtime:**

```json
{
  "paper": {
    "itemType": "thesis",
    "fields": {
      "title": "隧道衬砌病害智能识别研究",
      "date": "2024",
      "university": "示例大学",
      "thesisType": "博士学位论文",
      "language": "zh-CN"
    },
    "creators": [
      { "name": "张三", "creatorType": "author" }
    ],
    "identifiers": {
      "doi": "10.5555/tunnel.001"
    },
    "landingUrl": "https://doi.org/10.5555/tunnel.001",
    "pdfUrl": "https://repository.example.org/tunnel-001.pdf",
    "attachLandingUrlOnMissingPdf": true
  },
  "collection": "1:COLLECTION"
}
```

The top level contains only `paper` and optional `collection`. `paper` contains `itemType`, item-compatible `fields`, structured `creators`, `identifiers`, optional `landingUrl`/`pdfUrl`, and `attachLandingUrlOnMissingPdf: true`. DOI remains in `identifiers.doi`; the Host maps it to native DOI where supported and uses Extra only for an item type without native DOI.

**Submit/run/mutation command:** Execute the gate `command`, then rerun the initial gate.

**Completion:** Every qualified candidate has a generated path and stored hash; `not_attempted` candidates have no ingest payload.

**Forbidden:** Do not hand-write, edit, rename, combine, or batch generated payloads. Do not add `papers`/`papers[]`. Unknown bibliographic type uses `document`, not a guessed `journalArticle`.

**Recovery:** Rerun the initial gate. A metadata/PDF hash mismatch is a blocker; restore the accepted bytes or resubmit the legal upstream stage through a gate-issued path.

**Next:** Stage 70, or terminal when no candidate qualified.

### Stage 70 — Per-paper Zotero Ingest

**Purpose:** Execute exactly one typed mutation for each prepared candidate and persist a candidate/hash-bound Host receipt.

**Agent semantic responsibility:** Execute the exact gate command, preserve the exact Host response, classify fatal infrastructure/approval failures, and continue ordinary per-paper failures without hiding them.

**Runtime responsibility:** Revalidate the prepared payload hash, issue the exact candidate/path/hash/receipt contract, reject wrong paths/candidates/hashes and conflicting replay, index the Host outcome, and advance only after a terminal receipt.

**Gate command:** Run the initial gate; when `next_action` is `execute_ingest`, use only the returned fields.

**Payload path:** Read-only `ingest_payload_path`; write only the returned `receipt_path`.

**Minimal payload — receipt wrapper:**

```json
{
  "candidate_id": "doi:10.5555/tunnel.001",
  "ingest_payload_hash": "sha256:<gate-issued-hash>",
  "host_response": {
    "result": {
      "ingest": {
        "status": "created",
        "item": {
          "id": 101,
          "key": "ITEM101",
          "libraryId": 1
        },
        "hasPdfAttachment": true
      }
    }
  }
}
```

**Submit/run/mutation command:**

1. Execute the exact `zotero-bridge mutation literature-ingest --input @...` gate `command`.
2. Write the wrapper with the gate `candidate_id`, `ingest_payload_hash`, and exact JSON response under `host_response`.
3. Execute the gate `submit_command`.
4. Rerun the initial gate.

For a Host command that cannot run, write:

```json
{
  "candidate_id": "doi:10.5555/tunnel.001",
  "ingest_payload_hash": "sha256:<gate-issued-hash>",
  "status": "failed",
  "reason": "host_unavailable",
  "message": "The required Zotero Host Bridge mutation could not start."
}
```

Fatal `reason` values are `host_unavailable`, `approval_denied`, and `execution_blocked`; they produce canceled terminal state and stop later mutations. A normal paper-specific Host response with `status: "failed"` is recorded and processing continues.

**Completion:** Every prepared candidate has `created`, `existing`, or `failed`, unless a fatal receipt has moved the workflow to canceled terminal state. Metadata-rejected approved candidates remain `not_attempted`.

**Forbidden:** Do not mutate an unapproved candidate, use a different payload, reuse a receipt across candidates, report `existing` as created, or infer attachment success from `pdfUrl`. `hasPdfAttachment` in the Host receipt is authoritative.

**Recovery:** Exact receipt replay is idempotent. A changed replay, wrong candidate, wrong hash, wrong path, or modified ingest payload fails closed. Rerun the gate and use the current issued contract.

**Next:** Stage 70 for another prepared candidate; otherwise terminal.

### Terminal — Completed Or Canceled

The gate returns `next_action: "return_final_output"` with:

- `kind: "literature_search_ingest"` and `status: "completed"`, or
- `kind: "literature_search_ingest_canceled"` and `status: "canceled"`.

Write `result/search-ledger.json` as the compact audit summary defined below, then emit exactly one final JSON object. Do not add Markdown fences, logs, explanations, or a second object.

## Responsibilities

### Must Be Done By The LLM

- Interpret research intent, route modes, ask focused questions, and design the Search Brief.
- Select query/source lanes and execute legitimate public discovery.
- Judge direct-work identity, material versions, duplicates, relevance, candidate tiers, metadata authority, original publication language, creator completeness, PDF identity, and curation needs.
- Present the two user decisions and interpret approval, expansion, or cancellation.
- Produce stage payload semantic content, the compact audit ledger, and the final business JSON.

### Must Be Done By Scripts, Schema, Runner, And Host

- Gate and stage scripts validate action shape, stage order, round, candidate order, evidence counts, route coverage, replay, hashes, state/input drift, payload generation, and receipt binding.
- `assets/runtime-action.schema.json` defines action fields, enums, conditional metadata rules, and PDF-attempt shape.
- `assets/output.schema.json` validates completed and canceled final business output.
- `zotero-bridge` reads local Zotero/Synthesis context and performs each approved typed mutation.
- The Host validates item-type fields, deduplicates, writes native DOI when supported, creates attachments best-effort, and returns authoritative mutation/attachment status.
- The runner validates the final envelope and writes `result/result.json`.

### Forbidden

- Do not use temporary scripts for query strategy, matching, relevance, evidence interpretation, or metadata judgment.
- Do not bypass the gate from memory, patch state, or edit runtime-generated payloads.
- Do not hand-write runner-owned `result/result.json`.
- Do not invent sources, evidence, identifiers, creators, versions, PDF status, item refs, or attachment success.
- Do not perform batch mutation; each candidate has one typed payload and one receipt.

## Failure, Cancellation, And Resume

- User cancellation is legal only at Stage 10 or Stage 30 through `cancel_workflow` with `reason: "user_cancelled"`.
- A no-result discovery round is recorded honestly and proceeds to Stage 30, where the user may request a focused expansion or cancel.
- Source unavailability during discovery is recorded in `source_failures` and a same-class fallback is attempted.
- Metadata source/tool failure after scope approval becomes per-candidate `not_attempted` with checked sources and a stable reason; it does not reopen user scope.
- PDF source/tool failure becomes route status `unavailable` or `error`; all three routes are still required.
- An ordinary paper-specific Host failure is submitted and processing continues.
- Host unavailability, write-approval denial, or a runtime condition that prevents remaining mutations is submitted as a fatal Stage 70 receipt. Preserve completed receipts and return canceled output; never return pending.
- A schema or stage error leaves the current stage unchanged. Rerun the gate and repair only the issued payload.
- Input drift, corrupt state, modified accepted evidence, modified ingest payload, wrong receipt binding, and conflicting replay are blockers. Do not guess progress or rebuild state.
- On resume, run the initial gate, read `resume_packet`, read the one returned stage reference, and continue only `next_action`.

## Final Output

### Compact search ledger

`result/search-ledger.json` contains only:

- input hash or query summary, effective mode, breadth, and actual languages;
- discovery-round summaries: attempt counts, source failures, gaps, unique candidate ids, deduplication counts, and stop reasons;
- plan/scope decision summaries and approved/excluded ids;
- per-candidate paths/hashes for metadata, PDF, prepared payload, and Host receipt;
- final ingest/PDF/curation status and blocker/cancellation summary.

Do not duplicate full evidence payloads in the ledger. The JSON gate state remains the execution source of truth.

### Completed JSON

Every important displayed candidate appears in `outcomes`. Approved candidates end as `created`, `existing`, `failed`, or `not_attempted`. Attachment outcome comes from Host `hasPdfAttachment`; legal landing/manual-search links remain available when no PDF was attached.

```json
{
  "kind": "literature_search_ingest",
  "status": "completed",
  "query": "隧道衬砌视觉检测",
  "search_mode": "guided",
  "searchSummary": {
    "breadth": "broad",
    "languages": ["zh-CN", "en"],
    "queryLaneCount": 4,
    "sourceLaneCount": 7,
    "uniqueCandidateCount": 18,
    "selectedCount": 2,
    "stopReason": "all_applicable_lanes_completed"
  },
  "outcomes": [
    {
      "candidateId": "doi:10.5555/tunnel.001",
      "title": "隧道衬砌病害智能识别研究",
      "candidateTier": "needs_curation",
      "discoverySources": [
        {
          "source": "China DOI",
          "url": "https://doi.org/10.5555/tunnel.001",
          "queryLane": "core"
        }
      ],
      "identifiers": { "doi": "10.5555/tunnel.001" },
      "decision": "approved",
      "ingestStatus": "created",
      "pdfStatus": "attached",
      "needsCuration": true,
      "itemRef": { "id": 101, "key": "ITEM101", "libraryId": 1 },
      "landingUrl": "https://doi.org/10.5555/tunnel.001",
      "manualSearchLinks": [],
      "reasonCode": "native_creator_names_unverified"
    },
    {
      "candidateId": "source:uncertain-002",
      "title": "隧道衬砌检测方法研究",
      "candidateTier": "needs_curation",
      "discoverySources": [
        {
          "source": "University repository",
          "url": "https://repository.example.org/record/002",
          "queryLane": "multilingual"
        }
      ],
      "identifiers": {},
      "decision": "approved",
      "ingestStatus": "not_attempted",
      "pdfStatus": "skipped",
      "needsCuration": true,
      "landingUrl": "https://repository.example.org/record/002",
      "manualSearchLinks": [
        "https://repository.example.org/record/002"
      ],
      "reasonCode": "material_conflict_unresolved"
    }
  ],
  "searchLedgerPath": "result/search-ledger.json"
}
```

For `created` or `existing` records that still need metadata work, set `needsCuration: true`; the workflow apply hook adds the governed `status:need-metadata-curation` tag. Report `existing` with its actual `itemRef` and never as newly created.

### Canceled JSON

```json
{
  "kind": "literature_search_ingest_canceled",
  "status": "canceled",
  "reason": "user_cancelled",
  "message": "The user declined the ingest scope."
}
```

Use the terminal cancellation reason/message from gate state. Keep completed receipts in the compact ledger when cancellation occurs during Stage 70.

## Reference Loading Guide

Default to this file. Read only the reference returned by the current gate:

| Stage or need | Read |
| --- | --- |
| Stage 10 mode routing, guided intake, local coverage, Search Brief, query/source strategy | [Search Planning And Discovery](references/search-planning-and-discovery.md) |
| Stage 20 discovery rounds, multilingual expansion, deduplication, tiers, candidate presentation | [Search Planning And Discovery](references/search-planning-and-discovery.md) |
| Stage 30 scope approval, expansion gaps, and cancellation | [Search Planning And Discovery](references/search-planning-and-discovery.md) |
| Stage 40 identifier/title acceptance, direct-work roles, original script, creators, Zotero fields | [Metadata Resolution](references/metadata-resolution.md) |
| Stage 50 route order, reachability, PDF identity, legal sources, statuses, and anti-examples | [PDF Probe](references/pdf-probe.md) |
| Stages 60-70 typed payloads, hashes, Host receipts, retries, ledger, final output, and recovery | [Ingest, Output, And Recovery](references/ingest-output-recovery.md) |
| Terminal completion or cancellation | [Ingest, Output, And Recovery](references/ingest-output-recovery.md) |

All four references deepen the protocol. They do not replace the stage commands, payloads, completion criteria, or output shapes in this file.

## Execution Examples

Happy path:

1. Run the initial gate.
2. Build and obtain approval for Stage 10; submit `approve_search_plan`.
3. Execute Stage 20 round 1 and submit its cumulative discovery payload.
4. Present Stage 30; submit approved ingestible ids.
5. Automatically submit one Stage 40 metadata result per approved candidate.
6. Automatically submit one three-route Stage 50 result per qualified candidate.
7. Execute Stage 60 without editing generated payloads.
8. Execute and receipt each Stage 70 mutation.
9. When the gate returns `return_final_output`, write the compact ledger and emit one completed JSON object.

Expansion path: the user asks for more Chinese theses at Stage 30. Submit `request_discovery_expansion` for round 1, run Stage 20 round 2, include every round-1 candidate plus new candidates/evidence, then return to the same Stage 30 decision.

Near miss — premature discovery: non-blank `auto` appears sufficient, but Stage 10 is unapproved. Use only read-only local context to prepare the brief; do not issue external searches.

Near miss — identity change: an approved conference paper resolves only to a later journal article. Submit the conference candidate as `not_attempted`; do not replace it or ask for a third approval.

Near miss — missing PDF route: publisher and OA routes were attempted but web search was omitted. The Stage 50 payload fails; add the actual web-search outcome rather than marking the PDF missing early.

Near miss — modified ingest payload: a generated title is edited before mutation. The gate returns `blocked`; do not mutate or update the hash manually.
