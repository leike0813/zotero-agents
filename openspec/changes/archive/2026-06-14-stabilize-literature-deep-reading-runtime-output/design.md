# Design

## Runtime Translation Batches

`submit-reading-enrichment` will cascade a deterministic batch preparation step after writing enrichment views. The runtime reads `reading-blocks.json`, selects `translate: true` main and appendix blocks, estimates source size, and writes:

- `runtime/views/translation-batches-view.json`
- `runtime/payloads/translation-batches/batch-0001.json`

Batching is deterministic and preserves source block order. Formula blocks are included as context when helpful but are not counted as required semantic translation. Bibliography blocks are excluded. A structured block such as an image, table, or display formula is never split across batches.

The batch input file is a helper contract for agent execution, not a replacement for the official `block-translations.json` payload. The main agent delegates batch files and submits the reviewed combined payload.

## Stdout Discipline

Runtime command responses should be small summaries. Large data remains in views, payload files, or result files. Commands return counts, status, diagnostics summaries, and paths. This keeps ACP logs usable and prevents stdout transport from carrying large paper content.

## Translation Prompt Quality

Each batch file includes a subagent-ready prompt with explicit rules:

- translate fully and faithfully into the target language;
- do not summarize, omit, invent, or insert explanation;
- preserve Markdown, formulas, image references, table structure, and block ids;
- translate table text and captions while keeping table-like structure;
- report uncertainty in `quality_notes` instead of changing schema.

The main skill instructions require main-agent review before writing the final payload.

## Citation Graph Visibility

The graph model remains based on Host Bridge snapshot and layout. Stage 40 adds render diagnostics to `sections.json`, including model counts, drawable node counts, dropped edge counts, coordinate bounds, and layout status.

The standalone renderer marks its container with `data-zs-cg-status="ready|empty|failed"` and `data-zs-cg-error` when applicable. The final layout gives the graph a full-width section and stable stage dimensions so Sigma is not initialized in a cramped column.

## Stable Preface

Runtime normalizes agent `preface_cards` into four fixed slots:

1. 研究领域
2. 研究方向
3. 本文位置
4. 阅读路线

Agent text can fill these slots, but cannot change count, order, or final titles. Missing slots get short fallback text from available context; extra cards are preserved as notes/diagnostics and do not change layout.
