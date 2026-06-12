# Design: Stage 30 Block Translation

## Runtime Flow

Stage 30 runs after `stage_20_reading_enrichment`.

```text
runtime/views/reading-blocks.json
runtime/views/source-structure.json
runtime/views/concept-overlay-view.json
runtime/views/section-insights-view.json
runtime/payloads/block-translations.json
        |
        v
python scripts/deep_reading_runtime.py submit-block-translations --payload runtime/payloads/block-translations.json
        |
        v
runtime/views/translation-view.json
runtime/literature-deep-reading.sqlite
literature-deep-reading.result.json
```

The CLI remains a single script. There is no second runtime entrypoint.

## Payload

The Stage 30 payload has one top-level field: `translations`.

Each row contains:

- `block_id`
- `translated_markdown`
- `quality_notes`

The runtime supplies target language, coverage state, timestamps, diagnostics, and persistence state.

## Validation

The runtime rejects:

- unknown `block_id`
- duplicate `block_id`
- translations for blocks whose `translate` flag is false
- missing translations for translatable non-formula blocks
- empty submitted `translated_markdown`
- table translations that are not table-like Markdown or HTML

Formula blocks are optional. If omitted, the runtime carries the original formula forward with `status: "carried_over"`.

## View Shape

`translation-view.json` preserves source block order and emits one row per translated or carried-over block. Each row includes:

- `block_id`
- `section_anchor`
- `kind`
- `source_markdown`
- `translated_markdown`
- `status`
- `quality_notes`

This view is the renderer input for paragraph-level bilingual alignment. It does not include generated HTML.
