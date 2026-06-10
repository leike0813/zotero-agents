# Change: Remove Topic Positioning and Redesign Review Outline

## Summary

This change removes the top-level `positioning` topic synthesis section and
turns `review_outline` into the canonical review-writing strategy section.

## Motivation

`positioning` duplicates concerns already covered by `topic`, `summary`, and
`review_outline`. In particular, `positioning.scope_boundary` can drift from
`topic.scope_boundary`, creating conflicting topic boundaries. The current
`review_outline` is also too loose to reliably guide readers or agents on how
to write a review for the topic.

## Scope

- Hard-cut new split topic synthesis artifacts to remove `positioning`.
- Keep `topic.scope_boundary` as the only topic boundary source.
- Move topic importance and review-writing guidance into `review_outline`.
- Do not migrate existing persisted topics.
- Do not redesign the synthesis report architecture or workflow sequence.
