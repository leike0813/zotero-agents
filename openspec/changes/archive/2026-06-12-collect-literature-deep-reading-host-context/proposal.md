# Collect Literature Deep Reading Host Context

## Why

`literature-deep-reading` now has a bootstrap runtime that can unpack a source bundle and expose stable paper structure. The next required step is to let the agent read that structure, request external context, and let the runtime collect Host Bridge data needed by later reading-enrichment stages.

This change adds Stage 10 only. It does not add a workflow entrypoint, translation, reading-enrichment payloads, or final HTML rendering.

## What Changes

- Add the Stage 10 agent-facing `context-request.json` schema with flat semantic fields.
- Extend the single `deep_reading_runtime.py` entrypoint with `submit-context-request` and `validate-context-request`.
- Collect Host Bridge context best-effort through the run-local `zotero-bridge` CLI.
- Use `citation-graph get-slice` for topology and the new `citation-graph get-layout` capability for persisted force-layout coordinates.
- Generate Host Context Layer views for references, reference digests, citation graph snapshot/layout, topic, graph, concepts, and diagnostics.
- Keep all Host Bridge failures as structured diagnostics unless the agent payload itself is invalid.

## Impact

- Affected spec: `literature-deep-reading-skill`
- Affected source: `skills_src/literature-deep-reading/`
- Affected generated package: `skills_builtin/literature-deep-reading/`
- Affected tests: focused literature deep-reading runtime/package tests

