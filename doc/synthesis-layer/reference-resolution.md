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
| `status` | Matcher-local evidence outcome. It is not an Index/UI state. Materialized sidecar state is expressed as reference binding `accepted`, `candidate`, `rejected`, or `stale_target`. |
| `targetCanonicalReferenceId` | Effective canonical reference selected by dedupe or binding policy. |
| `targetSourceRef` | Optional Zotero-bound target `source_ref` when the target has an active binding. |
| `confidence` | `deterministic`, `high`, `low`, or `review`. |
| `diagnostics` | Structured evidence, tier, policy version, and reason codes. |
| `suggestedCandidates` | Bounded ranked candidates with target, score, evidence fields, and reasons. |

Only deterministic or high-confidence automatic outcomes may create or update `accepted` bindings. Low-confidence and review-confidence outcomes are candidates or review payloads until an explicit review action writes an accepted binding. Candidates alone never create library-to-library graph edges.

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
- Fuzzy title comparison runs only inside a bounded candidate pool from identifiers, title keys, year bands, author tokens, or other cheap indexes.
- Diagnostics/review candidates are normally top 3 to top 5 per reference instance.
- Batch rebuilds report timing by phase: identifier extraction, candidate generation, scoring, materialization, graph invalidation.

If candidate generation exceeds budget, prefer unbound or candidate outcomes over lowering precision.
