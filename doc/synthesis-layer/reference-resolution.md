# Reference Resolution

This document is the executable policy contract for literature-to-literature reference matching and external work dedupe. It is separate from topic discovery: `literature_matching_metadata` is topic-discovery metadata and must not be used to auto-match citation references.

## Goals

- Resolve extracted raw references to canonical references and, when evidence is strong enough, to Zotero-bound reference bindings with very high precision.
- Deduplicate repeated external work nodes without collapsing adjacent but distinct works.
- Preserve useful weaker candidates as bounded suggestions/review data.
- Make matcher changes measurable through fixture, gold labels, and experiment reports.

## Inputs

The matcher consumes only identity-bearing fields:

- current Zotero candidate metadata read for the selected binding/repair scope: `libraryId:itemKey`, title, year, authors, DOI, arXiv, URL, citeKey;
- raw reference: parsed title, year, authors, raw reference text, DOI, arXiv, URL, citeKey when available;
- existing canonical reference redirects, accepted/rejected bindings, and review effects.

The matcher must not read topic profiles, topic interest metadata, literature matching metadata, BM25 topic documents, citation metrics, graph layout, or LLM semantic judgments.

## Identity Operations

Reference identity work has three related operations:

| Operation | Meaning | Materialization Risk |
| --- | --- | --- |
| `canonical_dedupe` | Map one raw reference to an existing or new canonical reference. | False merges pollute many future references. |
| `reference_binding` | Map one effective canonical reference to a current Zotero `libraryId:itemKey`. | False positives create wrong graph edges. |
| `external_dedupe` | Decide whether two non-Zotero-bound work nodes are the same work. | False merges pollute many future references. |
| `retarget_to_library` | Replace an external target with an active Zotero-bound item when the same work is in the library. | Incorrect retarget hides an external work. |

Canonical target precedence:

1. accepted binding to an active Zotero item;
2. canonical reference redirected to a bound canonical reference;
3. existing active unbound canonical reference;
4. new provisional canonical reference;
5. unbound / ambiguous / review candidate.

Citation graph materialization consumes active raw references, effective canonical references, and reference bindings. It must not perform matching or dedupe itself.

## Identifier Normalization

All identifier matching is exact after canonicalization.

- DOI: lowercase; strip `https://doi.org/`, `http://dx.doi.org/`, and `doi:`; trim trailing punctuation; detect DOI strings in raw reference text.
- arXiv: canonical key is `arxiv:<id>`; extract from `arXiv:2201.12329`, `arxiv preprint arXiv:2201.12329`, arXiv `abs`/`pdf` URLs, and DOI aliases such as `10.48550/arXiv.2201.12329`; strip version suffixes for work identity.
- URL: lowercase scheme/host, trim trailing slashes, remove tracking query parameters when safe; arXiv URLs also produce arXiv keys.
- citeKey: lowercase and trim; exact citeKey matches are candidate identity signals below DOI/arXiv.

If arXiv `v1` and `v3` both exist as separate Zotero items, they share a work key. Without an accepted redirect/dedupe decision, matching should return `ambiguous` or create a bounded dedupe review instead of auto-picking both.

## Title Normalization

Maintain three title keys:

- `normalized_title`: NFKC, lowercase, punctuation normalized/stripped, readable spaces preserved.
- `compact_title`: whitespace removed from `normalized_title`; catches extraction errors such as `Endtoend`, `Dabdetr`, `Perpixel`, and `Maskedattention`.
- `strong_compact_title`: NFKC, lowercase, remove all symbols, punctuation, separators, and whitespace, then compare the remaining alphanumeric sequence exactly.

The matcher may generate stripped title variants before building keys, for example by removing obvious bibliographic suffixes such as proceedings venue, arXiv preprint marker, page range, trailing year, or publisher text. Diagnostics must retain the raw title and variant that matched.

A unique `strong_compact_title` hit is strong identity evidence even when author extraction is missing or year differs, unless a known danger pair or multiple targets share the same key.

## Author and Year Evidence

- Author evidence uses normalized surname-like tokens. `Wang`, `Wang, X.`, and `Xiaolong Wang` share surname evidence.
- Hyphenated and spaced surnames produce compact and split variants, e.g. `Li-Deng` -> `lideng`, `li`, `deng`.
- CJK names keep normalized full-name variants when present. Transliteration-only equivalence should be a suggestion unless supported by identifier/title evidence.
- Year exact, ±1, and ±2 are positive evidence. Year is not a standalone negative rule and must not defeat unique strong identifier or unique strong compact title matches.

## Matching Tiers

Evaluate candidates in this order:

1. Strong identifiers: DOI, arXiv, URL-derived arXiv, raw arXiv, raw DOI. Unique hits may create deterministic `accepted` bindings.
2. citeKey: unique exact citeKey hit may create a deterministic `accepted` binding.
3. Unique `strong_compact_title`: may create a deterministic/high-confidence `accepted` binding, unless a danger pair or multiple targets exist.
4. Exact `normalized_title` + author evidence + same/near year: low-confidence `suggested` when unique.
5. Stripped exact title + author evidence + same/near year: low-confidence `suggested` when unique.
6. `compact_title` + author evidence + same/near year: low-confidence `suggested` when unique.
7. Guarded fuzzy title: may auto-match only with very high title similarity, strong author overlap, acceptable year evidence, and no danger-neighbor signal; otherwise suggestion only.

When multiple candidates survive an automatic tier, keep them as review candidates instead of writing an accepted binding.

Low-confidence tiers preserve useful candidates for review and diagnostics, but they do not write `accepted` bindings and must not materialize library-to-library citation graph edges. A review action can later convert one candidate into an accepted reference binding.

## External Dedupe Policy

External dedupe uses the same normalization primitives with a stricter materialization policy:

- DOI/arXiv exact matches may automatically merge external records.
- URL-derived DOI/arXiv matches may automatically merge external records.
- Unique strong compact title may merge only when no danger signal or competing candidate exists.
- Fuzzy title similarity must not auto-merge external records in v1; it can only produce review candidates.
- Multiple strong candidates create an ambiguous review item, not an automatic redirect.
- Known danger pairs must never auto-merge.

Before formal external-dedupe rollout, extract a current-library fixture, build human-reviewed golden labels with the review harness, run policy experiments, and choose thresholds from measured precision/recall/false-merge results.

## Provisional External Identity

External references without DOI/arXiv/ISBN/stable URL use a provisional reference key. This key must be generated by the same normalization primitives used by this matcher, not by a separate ad hoc path.

There are two weak-identity classes:

| Class | Meaning | Graph/Dedupe Semantics |
| --- | --- | --- |
| `provisional_work` | A lower-confidence work-level external identity built from enough normalized bibliographic evidence. | May become an external graph node and may participate in bounded external dedupe/review. |
| `reference_scoped_placeholder` | A display/diagnostic placeholder for one reference instance whose evidence is too weak to safely form a work-level key. | Must not become a canonical external dedupe target; may appear only as unbound/reference-scoped context. |

Canonical `provisional_work` key inputs:

1. best stripped `strong_compact_title`;
2. normalized author surname tokens, capped and sorted;
3. year when present, as positive evidence rather than a hard discriminator;
4. optional normalized venue/container evidence when it improves separation without becoming a hard discriminator.

Raw reference fingerprint belongs to `reference_instance_id` and diagnostics by default. It must not be part of the default `provisional_work` key because the same work often appears with different raw reference strings across source papers. If normalized title/author/year/container evidence is insufficient to form a work-level key, leave the reference unbound or create a `reference_scoped_placeholder` instead of adding raw text as an identity tie-breaker.

The key should be deterministic and policy-versioned, for example `provisional:v1:<hash>`. Two code paths that see the same normalized work evidence must produce the same provisional canonical reference identity.

Lifecycle:

- A `provisional_work` external node can remain provisional indefinitely without blocking graph display.
- A `reference_scoped_placeholder` can remain unbound indefinitely without blocking graph display, but it must not be deduped or retargeted as a canonical work without first being promoted to `provisional_work` by stronger evidence or review.
- If a later reference, library item, import, or review action supplies a strong identifier for the same work, the system may retarget through a redirect.
- Automatic provisional-to-strong redirect is allowed only when the strong identifier match is unique and the provisional title evidence is compatible.
- If multiple provisional nodes or a library item compete for the same strong identity, open a bounded dedupe/retarget review item.
- Refresh reuses deterministic provisional keys and existing redirects; it must not create a fresh provisional ID for the same normalized evidence.

Provisional status is not an error state. It is a lower-confidence identity class. Workbench/debug should expose counts for provisional work nodes, reference-scoped placeholders, promoted/redirected nodes, and ambiguous retarget candidates.

## Dangerous Near Neighbors

These pairs must never become automatic matches under the default policy:

- `Transtrack: Multiple object tracking with transformer` != `MOTR`
- `Fast Segment Anything` != `Segment Anything`
- `Sparse R-CNN` != `Sparse DETR`
- `YOLACT++` != `YOLACT` unless future manual policy decides otherwise

Danger pairs can appear as low-ranked review suggestions only when clearly marked as non-automatic.

## Output Contract

The matcher returns a layered result:

| Field | Meaning |
| --- | --- |
| `status` | Matcher-local evidence outcome. It is not an Index/UI state. Materialized sidecar state is expressed as accepted binding facts or reference match proposals. |
| `targetCanonicalReferenceId` | Effective canonical reference selected by dedupe or binding policy. |
| `targetSourceRef` | Optional Zotero-bound target `source_ref` when the target has an active binding. |
| `confidence` | `deterministic`, `high`, `low`, or `review`. |
| `diagnostics` | Structured evidence, tier, policy version, and reason codes. |
| `suggestedCandidates` | Bounded ranked candidates with target, score, evidence fields, and reasons. |

Only deterministic or high-confidence outcomes from explicit advanced matching may create or update accepted binding facts automatically. Low-confidence and review-confidence outcomes become `synt_reference_match_proposal` rows until an explicit review action writes an accepted binding or canonical redirect. Open proposals never create library-to-library graph edges.

## Lightweight vs Advanced Matching

Two matching routes intentionally coexist:

| Route | Trigger | Algorithm | Output |
| --- | --- | --- | --- |
| Lightweight Sidecar Binding | Reference Sidecar refresh and workflow apply | citeKey and exact normalized title-year map lookups | accepted binding fact or unbound derived state |
| Advanced Reference Binding | `runAdvancedReferenceMatchingNow` binding pass | `referenceMatcher.ts` layered identifier/title/fuzzy policy against Zotero items | accepted binding facts for deterministic/high matches; proposals for suggested/ambiguous Zotero targets |
| Advanced External Dedupe | `runAdvancedReferenceMatchingNow` dedupe pass | cluster-first canonical dedupe by identifiers, title/year subclusters, structured containment classification, sticky representatives, and bounded fuzzy review candidates | accepted canonical redirects for deterministic duplicates; `canonical_merge` proposals for fuzzy, ambiguous, retarget, or semantic-risk candidates |

Refresh and workflow apply must not call `buildReferenceMatcherIndex`, `resolveReferenceWithPolicy`, or the advanced external dedupe pass. Advanced matching must be explicit, progress-reporting, and stale-tolerant; accepted binding or redirect fact changes may trigger a separate visible Citation Graph cache incremental refresh and then related-items sync, but never layout rebuild. Related-items sync must read accepted facts only and must not run matcher logic.

The external dedupe pass is precision-first and cluster-first. It builds an
effective canonical graph from active raw references, existing redirects, title
candidates, identifiers, year/author evidence, and sticky representative
signals. DOI/arXiv exact duplicates and safe exact title/year subclusters may
write redirects automatically. Fuzzy, ambiguous, retarget, and semantic-risk
edges become `canonical_merge` review proposals. Fuzzy output is review-only and
must not auto-write redirects.

Before a canonical enters cluster blocking, the production clustered dedupe pass classifies
it as `eligible`, `weak`, or `excluded`. Bare DOI/URL rows, titles with too few
content tokens, pure venue/page text, and other non-work-title records are
`excluded` and do not generate cluster edges. Mostly-author strings or heavily
bibliographic titles are `weak`: they remain visible as diagnostics/review
context but are not automatic redirect sources.

Contained-title classification uses structured bibliographic suffix evidence
rather than a growing venue-name table. Core markers and patterns include
DOI/arXiv fragments, `preprint`, `proceedings`, `conference`, `journal`,
`pp/pages`, `vol/no`, volume/issue/page forms, and editor/publisher-like
suffixes. Concrete venues such as CVPR, ICCV, NeurIPS, Sensors, or publisher
names are weak evidence only; by themselves they must not classify a containment
edge as bibliographic noise. If extra tokens remain unexplained and carry
semantic title content, the edge is `contained_extension_risk` and remains
review-only.

## Cluster Dedupe Harness

The realtime Synthesis Index harness lives in `tools/synthesis-index-harness`.
It reads Zotero SQLite and Synthesis plugin SQLite directly, constructs current
canonical dedupe inputs, runs the same cluster-first dedupe algorithm used by
production Advanced Matching, and writes results only to an isolated debug
SQLite database. Harness decisions are debug annotations, not production
proposal/redirect decisions.

The clustered algorithm exposes connected components, evidence edges,
deterministic subclusters, stable representative choices, and review/redirect
actions for inspection. Title containment is classified into bibliographic
noise, author noise, or semantic extension risk; semantic extension risk is
review-only and must not become an automatic redirect.

The cluster harness follows the design artifact at
`.codex/artifacts/advanced-reference-dedupe-cluster-algorithm.md`. It aggregates
active raw references through effective canonical redirects, preserves title
candidates from effective canonical rows, physical canonical rows, and raw
parsed references, and selects representatives by stability and title quality
before capped raw support. Existing redirect targets are sticky representatives;
retargeting them automatically requires strong deterministic DOI/arXiv or safe
exact-title evidence. Harness projected canonical lists are debug previews only
and never write to production sidecar tables.

The harness exposes eligibility and filter reasons in the Canonicals and
Cluster Results views. This is the primary debugging surface for bad extraction
inputs such as bare DOI rows, truncated author strings, and publication metadata
that should be filtered before ordinary dedupe.

The fixture/gold-label harness under
`.agents/skills/synthesis-reference-resolution-harness` remains the benchmark
workflow. Use the tools harness when debugging the current library/index state.

## Upstream Reference Quality Gate

Reference extraction quality belongs upstream of Synthesis identity matching.
The external `literature-analysis` skill should hard-block deterministic bad Stage
4 reference rows and soft-warn low-quality rows for LLM review before
`persist_references` commits them.

The builtin `literature-analysis` workflow apply step provides a fallback gate
before it writes the generated references note. This fallback removes only
deterministic invalid rows: empty titles, bare DOI/URL titles, publication
metadata-only titles, author-only strings, and titles with no usable content
tokens. Warning-only rows such as bibliographic suffixes, possible author-prefix
noise, missing year/authors, or short-but-plausible titles remain in the
references artifact and are reported through apply diagnostics.

Synthesis sidecar ingestion repeats the deterministic skip as a legacy/import
fallback. It must not treat quality warnings as matching evidence, must not
generate review proposals from the quality gate, and must not call Advanced
Reference Matching or clustered dedupe from refresh/workflow apply.

## Evaluation Metrics

Policy evaluation reports:

- auto-match precision, recall, and F1 against reviewed `gold_labels`;
- `candidate@1` and `candidate@3` recall for non-auto suggestions;
- false positive and false negative reference instance IDs;
- danger false positives;
- external dedupe precision, recall, and false merge count;
- retarget-to-library precision and missed retarget count.

The preferred production policy is the highest-recall policy with zero danger false positives and near-perfect auto-match precision.

## Performance Budget

Reference resolution must avoid unbounded `references * registry` fuzzy scans.

- Identifier lookup uses normalized DOI/arXiv/URL/citeKey indexes.
- Exact and strong compact title lookup uses title-key indexes.
- Fuzzy title comparison runs only inside a bounded candidate pool from title keys, year bands, rare/content tokens, contained strong-title checks, or other cheap indexes.
- External dedupe fuzzy comparison must not run a global all-canonical N² scan; it uses block and pair budgets and records diagnostics when budget is exceeded.
- Diagnostics/review candidates are normally top 3 to top 5 per reference instance.
- Batch rebuilds report timing by phase: identifier extraction, candidate generation, scoring, materialization, graph invalidation.

If candidate generation exceeds budget, prefer unbound or candidate outcomes over lowering precision.
