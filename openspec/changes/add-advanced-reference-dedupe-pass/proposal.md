# Add Advanced Reference Dedupe Pass

## Summary

Add an explicit canonical-to-canonical dedupe pass to Advanced Reference Matching. The existing Reference Sidecar refresh and workflow apply paths remain lightweight; fuzzy dedupe runs only inside the explicit advanced operation and only creates review proposals.

## Motivation

Current advanced matching binds canonical references to Zotero library items, but it does not merge repeated external canonical references. Obvious duplicates such as repeated `Attention is all you need` references remain split when the work is not present as a Zotero item.

## Scope

- Add `external_dedupe` as a second pass inside `runAdvancedReferenceMatchingNow`.
- Reuse existing proposal/fact persistence: `synt_reference_match_proposal(kind="canonical_merge")` and `synt_canonical_reference_redirect`.
- Keep refresh/apply guarded against heavy matching and fuzzy dedupe.
- Update active docs and specs to describe binding and dedupe as separate Advanced Matching passes.

## Non-Goals

- Do not add new database tables or host commands.
- Do not automatically rebuild citation graph cache after dedupe.
- Do not allow fuzzy matching to auto-write canonical redirects.
