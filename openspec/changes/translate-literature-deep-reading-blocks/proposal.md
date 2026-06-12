# Change: Translate Literature Deep Reading Blocks

## Summary

Implement `stage_30_block_translation` for the built-in `literature-deep-reading` skill. This stage lets the agent submit same-structure translations keyed by stable `reading_blocks.block_id`, and lets the single runtime script validate and normalize them into `translation-view.json`.

This change does not add a workflow and does not render `deep-reading.html`.

## Motivation

The final reader needs original and translated text to align at the natural block level. Stage 00 already produces stable source blocks, and Stage 20 already produces reading analysis views. Stage 30 fills the remaining translation data layer so a later renderer can produce equal-width bilingual reading modes without re-deciding document structure.

## Scope

- Add the Stage 30 `block-translations.json` schema to `literature-deep-reading`.
- Extend `scripts/deep_reading_runtime.py` with `submit-block-translations` and `validate-block-translations`.
- Validate that submitted translations target existing translatable blocks only.
- Generate:
  - `runtime/views/translation-view.json`
  - `runtime/views/diagnostics-translation.json`
- Persist normalized block translations in SQLite.
- Update the generated built-in skill package and focused tests.

## Out of Scope

- No user-visible workflow.
- No source bundle construction hook.
- No final self-contained HTML renderer.
- No Markdown-to-HTML rendering for translations.
- No translation provider integration; the agent authors the translation payload.
