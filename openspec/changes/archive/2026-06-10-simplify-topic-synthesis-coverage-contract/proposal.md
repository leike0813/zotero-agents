# Simplify Topic Synthesis Coverage Contract

## Summary

Hard-cut the split topic synthesis coverage artifact to a minimal current-state
contract. Coverage should keep only the Stage 60 fields the agent actually
authors, without runtime-generated duplicate summaries, nested external
literature wrappers, or fixed fallback prose.

## Why

The current coverage section repeats the same semantics across several fields:
route/claim/timeline summaries, reliability text, and nested external
literature fields are copied from the same Stage 60 payload values. This adds
noise to Topic Details, Markdown export, and stored artifacts while making the
contract harder for agents to satisfy.

## What Changes

- Stage 60 payload drops `reliability_summary`.
- Coverage artifacts keep only `coverage_verdict`, `coverage_reason`,
  `coverage_caveats`, `external_context_summary`, and
  `suggested_collection_directions`.
- Runtime stops generating `route_coverage_summary`, `claim_coverage_summary`,
  `timeline_coverage_summary`, and `coverage.external_literature`.
- Host artifact validation, DTOs, Markdown export, and Topic Details UI read the
  minimal coverage shape directly.

## Impact

This is a new split artifact contract hard cut. Existing persisted topics are
not migrated by this change.
