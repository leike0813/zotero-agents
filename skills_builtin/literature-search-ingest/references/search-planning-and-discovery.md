# Search Planning And Discovery

Use this reference for Stages 10, 20, and 30. The gate determines the current
stage, discovery round, payload path, and legal actions. `SKILL.md` remains the
complete execution contract; this document supplies deeper planning and
discovery judgment.

## Mode Decision Table

| Mode | Minimum usable input | Choose it when | Do not silently change it when |
| --- | --- | --- | --- |
| `auto` | Blank or non-blank `query` | The agent must recommend a mode after read-only local context inspection | External discovery has not been approved |
| `guided` | A research goal obtained through intake | The user begins with a question, problem, population, phenomenon, or uncertain scope | A broad goal could also be expressed as keywords |
| `topic_expansion` | A topic statement or usable topic artifact | The user wants broad coverage around a topic, concept, debate, region, or method | A seed paper also exists but the topic is the stated center |
| `paper_seed_expansion` | A resolvable seed work or local seed artifact | The user wants works connected to a particular paper through citations, authors, concepts, methods, or venues | The seed suggests a broader topic but the requested anchor remains the paper |
| `targeted_ingest` | An exact title, DOI, ISBN, PMID, arXiv id, or unambiguous record URL | The user wants one direct bibliographic work verified and ingested | Related-work discovery would be useful but was not requested |

An explicit mode is authoritative. If its minimum input is missing, ask only for
that input. For non-empty `auto`, inspect local context and recommend one mode in
the Search Brief. Approval is still required before any external discovery.

## Guided Intake Decision Tree

Ask the minimum questions needed to produce a defensible brief:

1. Is the desired output one exact work?
   - Yes: collect an identifier, exact title, or record URL and route to
     `targeted_ingest`.
   - No: continue.
2. Is one paper the requested expansion anchor?
   - Yes: resolve the seed from the query or local artifacts and route to
     `paper_seed_expansion`.
   - No: continue.
3. Is the research goal sufficiently specific to form inclusion criteria?
   - Yes: use it directly.
   - No: ask for the phenomenon/problem and the intended population, setting,
     discipline, time span, or document type only where they materially affect
     relevance.
4. Are language or regional constraints explicit?
   - Yes: preserve them as source and query guidance.
   - No: do not ask merely to fill every field; infer safe initial coverage and
     expose it in the brief.

Do not repeat a question when the parameter input, conversation, local context,
or seed artifact already provides the answer. Do not ask about optional fields
that can be proposed transparently and revised at Stage 10.

## Read-only Local Coverage Check

Local inspection can refine the brief but cannot mutate Zotero or count as
external discovery. Use `zotero-bridge` read-only operations supported by the
current Host to inspect:

- title, creator, year, language, identifiers, tags, and collection membership;
- attachment presence and local duplicate signals;
- selected or recently referenced items that plausibly serve as seeds;
- Synthesis artifacts such as topic reports, evidence tables, unresolved gaps,
  and cited source lists.

Record the exact read-only command or tool operation in the planning trace.
Summarize local coverage as:

- `covered`: direct local works that already address an inclusion concept;
- `partial`: related local works with a material gap;
- `missing`: concepts, languages, regions, document types, or periods absent
  from the inspected context;
- `seed_candidates`: local item or artifact ids with why each is usable.

Choose a seed artifact only when it has stable identity or enough evidence to
resolve the direct work. Prefer, in order:

1. a Zotero item with a normalized strong identifier;
2. a structured Synthesis artifact citing a stable item key or identifier;
3. a Zotero item with authoritative title, creators, and year;
4. a user-supplied exact title or URL.

Do not use a note fragment or translated title alone as seed identity.

## Complete Search Brief

The Stage 10 payload is the authoritative plan approved by the user:

```json
{
  "decision": "approve",
  "plan": {
    "search_mode": "topic_expansion",
    "objective": "Find direct empirical studies of tunnel-lining defect recognition.",
    "discipline_or_application": "Civil infrastructure inspection",
    "scope": {
      "date_range": "No hard limit; prioritize 2015-present",
      "language_hints": ["en", "zh"],
      "literature_types": ["journalArticle", "conferencePaper"],
      "regions": ["global", "China"]
    },
    "local_coverage": {
      "summary": "Local library covers visual crack detection but not regional multimodal studies.",
      "existing_identifiers": ["doi:10.1111/local-example"],
      "reusable_seed_refs": ["zotero:ABCD1234"],
      "gaps": ["Chinese-language evaluation studies", "multimodal sensing"]
    },
    "seed_artifacts": [
      {
        "ref": "zotero:ABCD1234",
        "use": "Stable DOI and direct relevance to the target setting."
      }
    ],
    "query_lanes": [
      {
        "lane": "core",
        "queries": [
          "\"tunnel lining\" \"defect recognition\"",
          "\"tunnel lining\" crack detection"
        ],
        "rationale": "Covers the central setting and task in English."
      },
      {
        "lane": "multilingual",
        "queries": [
          "\"隧道衬砌\" 病害 识别",
          "\"隧道衬砌\" 裂缝 检测"
        ],
        "rationale": "Covers original Chinese terminology and regional records."
      }
    ],
    "source_lanes": [
      {
        "source": "Crossref",
        "purpose": "Cross-disciplinary discovery and DOI evidence.",
        "fallback_sources": ["OpenAlex"]
      },
      {
        "source": "China DOI",
        "purpose": "Original Chinese records and regional coverage.",
        "fallback_sources": []
      }
    ],
    "inclusion_criteria": [
      "The direct work evaluates detection or recognition on tunnel linings."
    ],
    "exclusion_criteria": [
      "Generic defect detection without a tunnel-lining setting."
    ],
    "batch_size": 12,
    "stop_conditions": [
      "The breadth profile is satisfied.",
      "Applicable lanes no longer yield new relevant direct works."
    ]
  }
}
```

The runtime derives the fixed candidate tiers, material-conflict rule, PDF
policy, effective breadth, approval acknowledgement, and action name. They are
not agent-authored validation fields.

Every brief must expose:

- effective mode and objective;
- research questions or exact target identity;
- concepts, synonyms, translations, and exclusions that control relevance;
- all four applicable query lane kinds;
- source classes and their evidentiary roles;
- inclusion/exclusion rules and material-version policy;
- breadth profile, batching rule, and concrete stopping conditions;
- local coverage and chosen seed artifacts;
- authorization consequence: selected direct works proceed automatically through
  metadata, PDF, payload, and ingest gates after Stage 30 approval.

## Query Lane Templates

### Core lane

Combine the principal concept with population, setting, method, outcome, or
document type:

```text
"<principal concept>" <setting> <method>
"<principal concept>" <outcome> review
```

Use original terms supplied by the user before inventing synonyms.

### Multilingual lane

For every relevant language:

1. identify the concept's native scholarly term;
2. retain script variants and regional terminology;
3. generate language-specific queries rather than mechanically translating one
   English query;
4. query regional sources where they add coverage;
5. preserve original-script results as identity values.

Examples:

```text
"隧道衬砌" 病害 识别
"隧道襯砌" 裂縫 檢測
"туннельная обделка" обнаружение дефектов
```

Romanizations and translations support matching but never replace an
authoritative original title.

### Seed lane

For `paper_seed_expansion`, use:

- exact seed identifier and title;
- works citing the seed;
- seed references;
- related works by the same authors or project;
- method, dataset, named instrument, theory, and venue anchors;
- distinct material versions of the seed, tracked explicitly.

### Gap lane

Generate gap queries from:

- missing concepts in local coverage;
- a discovery round's excluded or weakly represented dimensions;
- missing languages, regions, populations, methods, years, or document types;
- Stage 30 expansion requests.

Each gap query must name the gap it addresses. It is not a general license to
repeat broad search.

## Source Selection Matrix

Use multiple source roles rather than treating one index as complete:

| Research need | Primary source roles | Supporting source roles |
| --- | --- | --- |
| Cross-disciplinary topic | Cross-domain scholarly indexes | Publisher pages, repositories, citation graphs |
| Biomedical topic | PMID/PubMed and DOI registries | Publisher pages, clinical or institutional repositories |
| Chinese-language or China-focused topic | China DOI, regional scholarly indexes, publisher pages | Cross-domain indexes, institutional repositories |
| Books and chapters | ISBN registries, library catalogs, publisher pages | Cross-domain indexes and repository records |
| Preprints and technical reports | arXiv or domain repository | Project pages, eventual publication landing page |
| Theses | Institutional or national thesis repository | Library catalog and author page |
| Standards, datasets, or software-adjacent literature | Issuing organization or project repository | Cross-domain indexes and citation graph |

Source availability does not relax identity rules. If a planned source is
unavailable, record the failed attempt and use another source with the same
role. Do not claim its lane was covered without an actual attempt.

## Breadth Completion

### `broad`

Complete only when:

- all applicable query lanes have actual attempts;
- all source roles in the approved plan have actual attempts or explicit
  unavailability evidence;
- language and regional lanes cover the stated hints and discovered original
  scripts;
- seed citation, reference, and concept expansions are attempted when
  applicable;
- at least two consecutive meaningful query/source combinations yield no new
  relevant direct works, or a user-defined hard limit is reached;
- unresolved gaps are listed for Stage 30.

### `balanced`

Complete when:

- core and applicable multilingual/seed lanes are attempted;
- at least one broad index and one authoritative or regional source role are
  attempted;
- the main inclusion concepts have representative ready or needs-curation
  candidates;
- the latest meaningful lane yields no material new cluster, or the approved
  practical limit is reached.

### `quick`

Complete when:

- the most discriminating core or exact-target queries are attempted;
- at least one authoritative or broad source role is attempted;
- the result set is sufficient for a clearly labeled preliminary candidate
  review;
- omitted lanes and resulting uncertainty are stated.

Never stop solely because a convenient page contains many results. Stop reasons
must describe completed coverage, saturation, a stated limit, or source
unavailability.

## Identity, Versions, And Deduplication

### Strong identity

Normalize before comparison:

- DOI: remove resolver prefixes, lowercase, and trim surrounding punctuation;
- ISBN: remove separators and validate ISBN-10/13;
- PMID: digits only;
- arXiv: canonical id with version separated from work identity where needed.

The same normalized strong identifier normally denotes one work. Conflicting
titles, types, or versions require investigation rather than forced merging.

### Weak identity

Without a strong identifier, build a comparison from:

- normalized authoritative original title;
- ordered creator evidence;
- publication year;
- container or issuing institution;
- document type;
- edition, preprint, accepted manuscript, article, thesis, chapter, or report
  status.

Translations and romanizations are matching evidence, not weak identity keys by
themselves.

### Material versions

Keep records separate when the bibliographic object changes materially:

- preprint versus published article;
- thesis versus derived article;
- book versus chapter;
- conference abstract versus full paper;
- first versus revised edition;
- corrigendum or dataset versus the work it describes.

Link related versions in evidence. Do not merge them merely because their titles
or authors overlap.

## Candidate Tiers And Presentation

| Tier | Minimum meaning | Selectable at Stage 30 |
| --- | --- | --- |
| `ready` | Stable direct-work identity, traceable landing page, no unresolved material conflict | Yes |
| `needs_curation` | Same direct work is traceable, but fields, creators, identifier, or version details need later care | Yes |
| `lead_only` | Relevance or identity rests on a snippet, bare title, weak aggregator, indirect container, or unresolved conflict | No |

Present candidates in readable batches. Each row includes:

- candidate id and original title;
- alternate/translated title only in a separate column;
- creators, year, type, language, and container where known;
- normalized identifiers;
- tier and concise relevance;
- discovery sources and stable landing URL;
- local duplicate or coverage signal;
- unresolved conflict or curation warning.

Show excluded and lead-only records separately with a reason. Do not imply that
only the first batch is selectable and do not impose an unstated selection
count.

## Discovery Round Payload

Each Stage 20 payload is a semantic delta for the gate-issued round. New
candidates omit `candidate_id`; the runtime creates a stable id from a strong
identifier or source identity. Use an existing gate-issued id only for an
evidence-backed update. The runtime merges the delta into cumulative state and
derives counts and deduplication summaries:

```json
{
  "query_attempts": [
    {
      "lane": "gap",
      "query": "\"隧道襯砌\" 裂縫 檢測",
      "source": "regional index",
      "status": "completed",
      "result_count": 18,
      "message": "Addresses the traditional-Chinese terminology gap."
    }
  ],
  "candidates": [
    {
      "tier": "ready",
      "title": "隧道衬砌病害识别",
      "alternate_titles": ["Tunnel lining defect recognition"],
      "creators_display": ["张三", "李四"],
      "year": "2024",
      "container": "隧道建设",
      "original_language": "zh",
      "material_version": "journal article",
      "identifiers": {"doi": "10.5555/example"},
      "landing_url": "https://doi.org/10.5555/example",
      "discovery_sources": [
        {
          "source": "China DOI",
          "url": "https://doi.org/10.5555/example",
          "lane": "gap",
          "reason": "Stable direct-work landing evidence.",
          "facts": ["original title", "DOI", "publication year"]
        }
      ],
      "matching_notes": [
        "The normalized DOI and original title identify the same direct work."
      ],
      "library_note": "No strong local identifier match.",
      "missing_fields": [],
      "recommendation_reason": "Directly evaluates the requested setting."
    }
  ],
  "uncovered_gaps": [],
  "stop_reason": "All approved gap lanes were attempted and no material gap remains."
}
```

Round 2 and later need not repeat unchanged candidates: the runtime retains
them. An update cannot silently remove earlier evidence or change a candidate's
title/year/container/material-version/identifier identity. A false duplicate
discovered through stronger identity evidence must be submitted as a new
candidate, with the previous relationship explained in `matching_notes`.
Unavailable sources belong on the corresponding `query_attempt`, using
`status: "unavailable"` or `"error"` and a useful `message`.

## Stage 30 Expansion

Expansion is one branch of the ingest-scope decision, not another decision
stage:

```json
{
  "decision": "expand",
  "gaps": [
    {
      "description": "Add traditional-Chinese terminology and regional sources.",
      "lanes": ["multilingual", "gap"]
    }
  ]
}
```

The runtime increments the round and returns to Stage 20. After the cumulative
round is recorded, the same Stage 30 decision recurs. The user may approve,
request another focused expansion, or cancel.

## Examples And Anti-examples

### Good: topic expansion

The brief defines the topic, languages, source roles, inclusion criteria, and
material-version policy. Two discovery rounds retain the first round's
candidates. The second round adds regional works and closes a named language
gap. Candidate review separates direct works from indirect leads.

### Good: no results

The payload records actual core, multilingual, and source attempts with zero
usable results; `candidates` is empty; `stop_reason` states saturation or the
approved limit. Stage 30 presents the empty result plus gaps and lets the user
expand, approve an empty scope, or cancel.

### Good: source unavailable

A planned source attempt uses `status: "unavailable"` with a concrete cause.
Another source fulfills the same role. Coverage claims mention the unavailable
lane rather than pretending it succeeded.

### Reject: wrong merge

Two records share an English translated title but have different original
titles and publication types. Merging them on the translation discards direct
work identity. Keep both until authoritative evidence resolves the relation.

### Reject: translation-based deduplication

A Chinese original article and an English-language review cite the same
translated phrase. The translation is not a deduplication key. Compare original
titles, identifiers, creators, years, types, and containers.

### Reject: summary-only discovery

An agent reports “searched broadly” without query attempts, source attempts,
cumulative candidates, or a concrete stop reason. The runtime must reject the
payload.

### Reject: expansion drops prior candidates

Round 2 contains only newly found records. This violates cumulative discovery
and must fail closed. Copy the prior candidates and their evidence, add the new
records, and document any evidence-based reclassification.
