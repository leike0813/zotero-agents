# Optimize Topic Synthesis Cross-Paper Context

## Why

Stage 5 currently exports `runtime/views/cross-paper-context.json` by exposing
nearly full artifact bundle receipts to the agent. A 21-paper run produced a
multi-megabyte, 55k-line JSON view dominated by decoded artifact text,
references internals, citation analysis internals, and raw note payload fields.
That context is too large and poorly shaped for cross-paper synthesis.

## What Changes

- Export LLM-facing cross-paper context as Markdown views instead of a giant
  JSON payload.
- Split the main synthesis context from the external literature context.
- Filter digest content by top-level section order and keep only the first four
  `##` sections.
- Render references as compact `id | year | authors | title` rows.
- Render citation analysis using only the full `citation_analysis.report_md`.
- Keep a small machine manifest for provenance, paths, hashes, counts, and
  diagnostics.

## Impact

- Affects create/update topic synthesis package-local runtime scripts.
- Affects create/update topic synthesis skill instructions and runner prompts.
- Does not change Workbench UI, Zotero MCP tool surface, synchronization,
  recovery, or canonical topic persistence.
