## Overview

This change makes reference resolution measurable before tuning it. The current
test library becomes a frozen fixture with a gold-label file, then candidate
policies are evaluated against that fixture before selecting the production
matcher behavior.

## Decisions

### Fixture and Gold Labels

- Store sanitized library papers, reference instances, current resolver output,
  gold labels, and dangerous pairs under
  `test/fixtures/synthesis-reference-resolution/current-library-v1/`.
- Every reference instance in the fixture has exactly one gold label:
  `match`, `suggested_match`, `ambiguous`, `external_or_missing`, or `ignore`.
- Labels may include `target_item_key`, `target_literature_item_id`,
  evidence fields, and a rationale. Paths, tokens, note HTML, and profile
  details are not stored.

### Matcher Shape

- Add a dedicated reference matcher module with pure functions for
  normalization, index building, candidate generation, policy evaluation, and
  metrics.
- `literature_matching_metadata` remains out of scope for reference identity
  matching. It is only topic discovery/ranking metadata.
- Production output is layered:
  - `matched`: high-confidence identity result that may update graph facts.
  - `suggested_candidates`: low-confidence or review-worthy candidates stored
    in diagnostics/review payloads.
  - `ambiguous`/`unresolved`: no graph match, but review may show candidates.

### Policy Evaluation

- Baseline reproduces the current conservative matcher.
- Policy A canonicalizes strong identifiers including arXiv DOI/URL/raw text.
- Policy B adds exact title + author overlap + year delta <= 1.
- Policy C adds compact title normalization for punctuation/spaceless variants.
- Policy D adds guarded fuzzy title matching; only very high confidence can
  auto-match, otherwise it emits suggestions.
- The production default may use the safest policy that keeps dangerous-pair
  false positives at zero.

## Risks

- A full fixture is large but bounded by the current test library and is stable
  enough for regression tests.
- Over-aggressive fuzzy matching can corrupt citation graph facts, so weaker
  candidates must stay out of `matched` unless they pass strict guards.
- Gold labels may need future refinement as the test corpus changes; fixture
  versioning keeps those updates explicit.
