# Change: Refine Topic Synthesis Summary, Future Directions, and Debates

## Summary

This change cleans up the split topic synthesis artifact contract by removing
duplicated summary fields, replacing the `gaps` section with
`future_directions`, and making debate rendering use the current judgment text
authored in Stage 40.

## Motivation

Current split runtime materializes `summary.summary` and
`summary.long_summary` with the same value, which adds noise without semantic
value. It also mixes coverage caveats and gaps: Stage 60 caveats can be copied
into the artifact `gaps` section, making Coverage and Gaps duplicate each
other. Finally, debate entries can display runtime fallback text even when the
agent wrote `current_judgment`.

## Scope

- Hard-cut new split artifacts to `future_directions`.
- Keep `coverage.coverage_caveats` as the coverage limitation source.
- Keep Stage 40 as the authoring stage for future research directions.
- Do not redesign the synthesis report/export Markdown architecture.
- Do not migrate persisted topics.
