# Design

## Model

Advanced Reference Matching has two explicit passes:

- `reference_binding`: current canonical reference to Zotero item matching.
- `external_dedupe`: new canonical reference to canonical reference dedupe.

`external_dedupe` consumes active raw references, effective canonical references, accepted bindings, redirects, and proposal history. It writes accepted merge facts only to `synt_canonical_reference_redirect` and writes reviewable candidates to `synt_reference_match_proposal(kind="canonical_merge")`.

## Dedupe Policy

The pass is precision-first.

- DOI/arXiv exact duplicate groups may auto-redirect when the target is unique.
- URL-derived DOI/arXiv groups may auto-redirect when the target is unique.
- Unique `strong_compact_title` with compatible year may auto-redirect only when there is no identifier conflict, no accepted binding, no competing target, and no danger signal.
- `normalized_title + year` and `compact_title + year` groups produce canonical merge proposals unless the implementation can prove the same high-confidence conditions as strong compact title.
- Fuzzy matching never auto-redirects in this change.

## Bounded Fuzzy Pass

Fuzzy matching runs after deterministic clusters are formed. It compares unresolved singleton sources against deterministic cluster representatives and remaining singleton targets, not every canonical pair.

Cheap blocking keys generate candidates:

- `year + first2_content_tokens + last1_content_token`;
- `year + rare2_content_tokens + title_length_bucket`;
- contained strong title, where the shorter title has at least four content tokens.

Before expensive title similarity, candidates must pass year, identifier conflict, length-ratio, and token-overlap filters. Each block and operation has a pair budget. Over-budget work records diagnostics and does not widen scanning.

## UI and Graph

Existing Review Center and Index drawer render `canonical_merge` proposals. Accepted proposals write redirects and mark `citation-graph:library` stale. Graph rebuild consumes redirects but never runs dedupe.
