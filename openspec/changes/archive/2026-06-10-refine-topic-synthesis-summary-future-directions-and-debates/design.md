# Design: Future Directions Contract

Stage 40 writes `future_directions[]` as source-paper-grounded research
limitations and future research directions. A row must contain `id`, `title`,
`direction_type`, `current_limitation`, `future_direction`, `rationale`, and
`source_paper_refs`.

`coverage.coverage_caveats` remains Stage 60-owned and describes synthesis
coverage limits such as evidence scope, workset bias, missing artifacts,
external literature incompleteness, and topic boundary uncertainty.

Runtime materialization is intentionally simple:

- `summary` contains only `brief`, `summary`, and `key_takeaways`.
- `future_directions` is normalized only from Stage 40
  `future_directions`.
- `debates` use a dedicated normalizer that prioritizes
  `current_judgment`.

The UI exposes `future_directions` in its own Topic Details tab. Coverage no
longer renders these rows.
