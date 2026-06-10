# Design: Section Simplification and Review Outline UI

## Section Shape

`improvement_dimensions` becomes an object with `summary` and `dimensions`.
Runtime uses Stage 40 `improvement_dimension_summary` as the object summary and
normalizes Stage 40 `improvement_dimensions[]` into `dimensions[]`.

`external_literature_analysis` is removed as a standalone section. Stage 60
external context fields are materialized under `coverage.external_literature`.

`review_outline` remains the current Stage 40 payload object. Runtime does not
force it into a new schema. Topic Details uses a deterministic adapter to render
known groups: introduction, related work, main sections, and other outline
notes.

## UI

Coverage becomes the only user-facing place for verdicts, reliability, caveats,
gaps, external literature boundary, and collection suggestions. Identical text
and duplicate suggestions are collapsed before rendering.
