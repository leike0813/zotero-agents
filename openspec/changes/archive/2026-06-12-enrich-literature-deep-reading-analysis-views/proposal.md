# Change: Enrich Literature Deep Reading Analysis Views

## Summary

Implement `stage_20_reading_enrichment` for the built-in `literature-deep-reading` skill. This stage lets the agent read the bootstrap and Host Context Layer views, submit a reading-enrichment payload, and lets the single runtime script normalize that payload into Analysis Layer views for later translation and final HTML rendering.

This change does not add a workflow, translate the source paper, or render `deep-reading.html`.

## Motivation

The DETR sample has validated the product shape for Preface, section-level reading aids, concept overlay data, structured references, summary, and post-reading extensions. Those parts need a stable runtime data layer before the later translation and self-contained HTML renderer stages can be implemented.

## Scope

- Add the Stage 20 `reading-enrichment.json` schema to `literature-deep-reading`.
- Extend `scripts/deep_reading_runtime.py` with `submit-reading-enrichment` and `validate-reading-enrichment`.
- Normalize agent-authored reading aids and existing Host context into:
  - `preface-view.json`
  - `section-insights-view.json`
  - `concept-overlay-view.json`
  - `references-view.json`
  - `summary-view.json`
  - `extensions-view.json`
  - `diagnostics-enrichment.json`
- Persist normalized concepts and section insights in SQLite runtime state.
- Update the generated built-in skill package and focused tests.

## Out of Scope

- No new user-visible workflow.
- No source bundle construction hook.
- No body translation or bilingual layout.
- No final single-file HTML renderer.
- No browser-side concept overlay or graph rendering implementation.
