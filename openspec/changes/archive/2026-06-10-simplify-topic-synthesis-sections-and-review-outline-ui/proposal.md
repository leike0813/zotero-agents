# Change: Simplify Topic Synthesis Sections and Review Outline UI

## Why

The split topic synthesis artifact currently contains several small or repeated
sections:

- `improvement_dimension_summary` is a standalone one-field section.
- `improvement_dimensions[]` can duplicate text across `summary` and
  `analysis`.
- `external_literature_analysis` repeats coverage content in a tiny standalone
  section.
- Topic Details flattens `review_outline` recursively into a stepper, which
  does not match the current payload shape.

## What Changes

- Fold improvement dimension summary into `improvement_dimensions.summary`.
- Keep each improvement dimension row focused on `analysis` instead of
  duplicating `summary`.
- Fold external literature coverage into `coverage.external_literature`.
- Redesign Review Outline rendering in Topic Details without changing the
  agent-facing Stage 40 payload shape.
- Deduplicate repeated coverage content in the Coverage page.

## Impact

This is a hard cut for new split topic synthesis artifacts. Existing persisted
topics are not migrated by this change.
