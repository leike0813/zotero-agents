# Synthesis Reference Resolution Normalization and Matching

This document defines the first DB-first reference identity matcher for the
Synthesis layer. It is intentionally separate from topic discovery metadata:
`literature_matching_metadata` is not an identity signal and must not be used to
auto-match references between papers.

## Goals

- Resolve extracted reference instances to Zotero-bound `literature_item` rows
  with very high precision.
- Deduplicate repeated external literature records created from references
  without collapsing semantically distinct works.
- Preserve useful but weaker candidates for review as `suggested_candidates`.
- Avoid false citation graph edges for semantically adjacent but distinct works.
- Make matching changes measurable through a fixed fixture and experiment
  harness.

## Inputs

The matcher consumes only identity-bearing reference and library-paper fields:

- library paper: `paper_ref`, Zotero `item_key`, title, year, authors, DOI,
  arXiv, URL, citeKey.
- reference instance: parsed title, year, authors, raw reference text, DOI,
  arXiv, URL, citeKey when available.

The matcher does not read topic profiles, topic interest metadata, literature
matching metadata, BM25 topic documents, citation metrics, or graph layout.

## Identity Operations

Reference identity work has three related but distinct operations:

- `reference_matching`: maps a `reference_instance` to a canonical
  `literature_item`.
- `external_dedupe`: decides whether two non-Zotero-bound literature items are
  the same work and should be connected by redirect.
- `retarget_to_library`: replaces an external target with an active
  Zotero-bound literature item when the same work is present in the library.

These operations share normalization, candidate generation, and scoring
primitives, but they must not share one materialization policy. Matching a
reference to a library item, merging two external records, and retargeting an
external record to a Zotero-bound item have different user-visible risks.

The canonical target precedence is:

1. active Zotero-bound library item;
2. external item redirected to an active Zotero-bound item;
3. existing canonical external literature item;
4. new provisional external literature item;
5. unresolved / ambiguous / review.

Citation graph materialization consumes canonicalized reference resolutions. It
must not perform matching or dedupe itself.

## Identifier Normalization

All identifier matching is exact after canonicalization.

- DOI:
  - lowercase;
  - strip `https://doi.org/`, `http://dx.doi.org/`, and `doi:`;
  - trim trailing punctuation;
  - detect DOI strings in raw reference text.
- arXiv:
  - canonical key is `arxiv:<id>`;
  - extract from `arXiv:2201.12329`, `arxiv preprint arXiv:2201.12329`,
    `https://arxiv.org/abs/2201.12329`, `https://arxiv.org/pdf/...`, and
    DOI aliases like `10.48550/arXiv.2201.12329`;
  - strip version suffixes for identity matching.
- URL:
  - lowercase scheme/host text and trim trailing slashes;
  - arXiv URLs also produce an arXiv identity key.
- citeKey:
  - lowercase and trim;
  - exact citeKey matches are candidate identity signals but remain below DOI
    and arXiv.

## Title Normalization

Three title forms are maintained:

- `normalized_title`: existing deterministic NFKC lowercase punctuation-stripped
  title.
- `compact_title`: removes whitespace from `normalized_title`; this catches
  extraction errors such as `Endtoend`, `Dabdetr`, `Perpixel`, and
  `Maskedattention`.
- `strong_compact_title`: NFKC, lowercase, remove all symbols, punctuation,
  separators, and whitespace, then compare the remaining alphanumeric sequence
  exactly. A unique `strong_compact_title` hit is strong identity evidence even
  when author extraction is missing or year differs.

The matcher may generate stripped title variants before these keys are built,
for example by removing obvious bibliographic suffixes such as proceedings
venue, arXiv preprint marker, page range, or trailing year text. The raw title
and stripped variant that produced a match must remain visible in diagnostics.

Fuzzy title matching is guarded. It may produce suggestions broadly, but it may
auto-match only when author overlap and year evidence are also strong.

## Author and Year Evidence

Author evidence uses normalized surname-like tokens. A candidate is stronger
when at least one surname overlaps for exact-title cases and at least two
surnames overlap for fuzzy-title cases.

Year matching accepts exact year and a ±1/±2 year window as positive evidence
for preprint/conference or preprint/journal drift. Year is not a standalone
negative rule: it must not defeat a unique strong identifier or unique
`strong_compact_title` match. A larger year mismatch can still downgrade weaker
title/fuzzy candidates to review-only suggestions.

Author normalization rules:

- Latin names produce surname tokens and optional initial tokens. `Wang`,
  `Wang, X.`, and `Xiaolong Wang` share surname evidence, but surname-only
  overlap is not sufficient to auto-match a fuzzy title.
- Hyphenated and spaced surnames produce both compact and split variants, e.g.
  `Li-Deng` -> `lideng`, `li`, `deng`.
- CJK names keep normalized full-name variants when present. Transliteration
  differences may produce suggestions, but should not auto-match without title
  or identifier evidence.
- Author evidence is positive evidence only. Missing author extraction should
  not defeat a unique strong identifier or unique strong compact title match.

## Version and Language Edge Cases

### Conference / Journal / Extended Versions

Conference and journal extensions can share most title words while being
distinct works. The matcher therefore treats venue/year/version signals as
review evidence unless a strong identifier proves identity:

- DOI/arXiv/citeKey exact identity may auto-match according to the normal
  identifier tiers.
- Same or near-same title with substantially different venue/year should produce
  `suggested_candidates` or `ambiguous`, not automatic merge, when no strong
  identifier exists.
- If both versions exist in the library, candidate output should preserve both
  and explain the variant risk.

### arXiv Versions

arXiv identity matching strips version suffixes by default because references
often omit `vN`. If the library contains both `arXiv:xxxx.v1` and
`arXiv:xxxx.v3` as separate Zotero items:

- they share the same canonical arXiv work key;
- reference matching should prefer the active canonical Zotero-bound item if a
  redirect/dedupe decision exists;
- without such a decision, the result should be `ambiguous` or create a dedupe
  review, not two graph nodes for the same reference.

### Non-English and Parallel Titles

The matcher should retain title variants rather than assuming English-only
titles:

- bilingual titles split by punctuation, parentheses, slash, colon, or translated
  subtitle markers may produce parallel title variants;
- exact match on the same-script normalized title can follow normal title tiers;
- translation-only or cross-script semantic equivalence should be a suggestion
  unless supported by DOI/arXiv/citeKey;
- library records with both Chinese and English titles should index both title
  variants, while diagnostics should explain which variant matched.

## Matching Tiers

The production matcher evaluates candidates in this order:

1. **Strong identifiers**: DOI, arXiv, URL-derived arXiv, raw arXiv, raw DOI.
   Unique hits are deterministic `matched`.
2. **citeKey**: unique exact citeKey hit is deterministic `matched`.
3. **Unique strong compact title**: unique hit is deterministic or high
   confidence `matched`, unless it triggers a known danger pair or multiple
   library/external targets share the same key.
4. **Exact title + year + author evidence**: unique hit is low-confidence
   `matched`.
5. **Exact title + author evidence + year ±1/±2 evidence**: unique hit is low-confidence
   `matched`.
6. **Compact title + author evidence + year ±1/±2 evidence**: unique hit is low-confidence
   `matched`.
7. **Guarded fuzzy title**: very high title similarity, strong author overlap,
   and acceptable year evidence may auto-match; otherwise candidates are only
   `suggested_candidates`.

When multiple candidates survive an auto-match tier, the result is `ambiguous`
with suggestions, not an automatic match.

## External Literature Dedupe Policy

External dedupe uses the same identity evidence as reference matching, but a
more conservative policy:

- DOI/arXiv exact matches may automatically merge external records.
- URL-derived DOI/arXiv matches may automatically merge external records.
- Unique strong compact title exact matches may merge only when no danger signal
  or competing candidate exists.
- Fuzzy title similarity must not automatically merge external records in the
  first production policy; it can only produce review candidates.
- Multiple strong candidates create an ambiguous review item, not an automatic
  redirect.
- Known danger pairs must never auto-merge.

When a library-bound candidate and an external candidate both match, the
library-bound item wins. The external item should be redirected to the library
item, and existing reference resolutions / citation edges should retarget
through the redirect layer rather than duplicating nodes.

The intended processing order is:

1. Extract identity keys for library items, existing external items, and new
   reference instances.
2. Apply existing literature redirects before candidate lookup.
3. Try active Zotero-bound targets first.
4. If no library target matches, try canonical external targets.
5. If duplicate external targets are detected, create or apply external dedupe
   redirects according to policy.
6. Materialize each reference resolution to the canonical target.
7. Build citation graph edges only from canonicalized resolutions.

## Dangerous Near Neighbors

The benchmark contains explicit danger pairs. These must never become automatic
matches under the evaluated production policy:

- `Transtrack: Multiple object tracking with transformer` != `MOTR`
- `Fast Segment Anything` != `Segment Anything`
- `Sparse R-CNN` != `Sparse DETR`
- `YOLACT++` != `YOLACT` unless future manual policy decides otherwise

Danger pairs can still appear as low-ranked review suggestions if clearly
marked as non-automatic, but the default policy should avoid surfacing noisy
near-neighbor suggestions.

## Output Contract

The matcher returns a layered result:

- `status`: `matched`, `unmatched`, or `ambiguous`.
- `targetPaperRef`: present only for auto-matched results.
- `confidence`: `deterministic`, `low`, or `review`.
- `diagnostics`: structured evidence and policy details.
- `suggestedCandidates`: bounded ranked candidates with score, target,
  evidence fields, and reason codes.

Only `status=matched` may create or update matched citation graph edges.
Suggested candidates are stored in diagnostics/review payloads and require
explicit review action before they change graph facts.

## Evaluation Metrics

Policy evaluation reports:

- auto-match precision, recall, and F1 against `gold_labels`.
- `candidate@1` and `candidate@3` recall for non-auto suggestions.
- false positive and false negative reference instance ids.
- danger false positives.
- external dedupe precision, recall, and false merge count.
- retarget-to-library precision and missed retarget count.

The preferred production policy is the highest-recall policy with zero danger
false positives and near-perfect auto-match precision.

External dedupe must follow the same evidence-driven workflow used for library
reference matching before production rollout:

1. Extract a current-library fixture containing library items, reference
   instances, current external literature records, redirects, and resolver
   output.
2. Generate seed labels from deterministic identifiers and existing production
   output.
3. Use an interactive human-review harness to build
   `gold-labels.external-dedupe.reviewed.json`.
4. Run policy experiments against the reviewed labels and danger pairs.
5. Choose the final auto-merge / review thresholds from measured precision,
   recall, false merge, and candidate recall.

No new external dedupe auto-merge policy should ship solely from hand-written
rules or spot checks against a few examples.

## Performance Budget

Reference resolution must avoid an unbounded `references * registry` fuzzy scan.
For a paper with 100+ references and a registry with 1k/10k papers:

- identifier lookup must use normalized DOI/arXiv/URL/citeKey indexes;
- exact and strong compact title lookup must use title-key indexes;
- fuzzy title comparison may run only inside a bounded candidate pool generated
  by identifiers, title keys, year bands, author tokens, or other cheap indexes;
- candidate lists returned to diagnostics/review should be bounded, normally top
  3 to top 5 per reference instance;
- large batch rebuilds must report timing by phase: identifier extraction,
  candidate generation, scoring, materialization, and graph invalidation.

If candidate generation exceeds budget, the matcher should prefer unresolved or
suggested candidates over lowering precision.
