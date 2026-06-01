## Context

Reference resolution false positives are high-risk because they create wrong
citation graph edges. The reviewed design allows low-confidence evidence to
remain useful, but only as suggestions or review payload.

## Goals / Non-Goals

**Goals:**

- Match the output contract: `matched`, `suggested`, `unmatched`, `ambiguous`.
- Allow only deterministic/high-confidence matches to produce matched graph
  facts.
- Preserve low-confidence candidates in bounded suggestions.

**Non-Goals:**

- No embedding, BM25, semantic-search, or LLM pairwise matcher.
- No unbounded review-card generation.
- No broad matcher threshold experimentation in this change.

## Decisions

- Strong identifiers, exact citeKey, and unique strong compact title may produce
  graph-safe auto matches when no danger signal or collision exists.
- Exact title with author/year, stripped exact title, compact title, and
  guarded fuzzy candidates are suggestions unless they satisfy the documented
  high-confidence auto tier.
- Citation graph materialization trusts only stored matched/confirmed
  resolutions, not raw suggestion candidates.

## Risks / Trade-offs

- Recall may drop for automatic matches. That is acceptable because candidate
  recall is preserved through suggestions and reviewed actions.
