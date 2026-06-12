## Design Source

This change implements Stage 10 from:

- `artifact/literature-deep-reading-workflow-design.md`
- `artifact/literature-deep-reading-skill-runtime-contract.md`

It builds on `bootstrap-literature-deep-reading-skill-runtime` and keeps the first implementation as a single built-in skill.

## Stage Boundary

`stage_10_source_reading_context_request` starts after `stage_00_bootstrap`. The agent reads the bootstrap views and writes only:

```text
runtime/payloads/context-request.json
```

The runtime then validates the payload and performs all deterministic Host Bridge collection as a cascade in the same script.

This stage does not generate user-facing prose, translations, concept overlays, final sections data, or HTML.

## Host Bridge Access

The runtime resolves Host Bridge CLI in this order:

1. `ZOTERO_BRIDGE_BIN`
2. `.zotero-bridge/bin/zotero-bridge.cmd`
3. `.zotero-bridge/bin/zotero-bridge.exe`
4. `.zotero-bridge/bin/zotero-bridge`

The runtime calls semantic CLI commands only:

- `reference-index get`
- `paper-artifacts manifest`
- `paper-artifacts export-filtered`
- `citation-graph get-slice`
- `citation-graph get-layout`
- `concepts query`
- `topics get-context` only when a concrete topic id is available

Host Bridge absence or per-capability failure writes diagnostics and empty views. It must not prevent core paper reading from continuing.

## Citation Graph Layout

Graph topology and layout are separate runtime facts:

- `citation-graph get-slice` returns the bounded node/edge snapshot.
- `citation-graph get-layout` returns persisted coordinates and layout status.

The runtime passes `preset: "force"` and `allowTruncated: true` to layout reads. It does not call any recompute or refresh command and does not synthesize fallback coordinates in Python.

When snapshot and layout disagree, both raw results are retained. The normalized layout only includes nodes with coordinates, and diagnostics record missing or extra node ids.

## Reference Digest Collection

References are bound to library papers using available structured fields first. If bindings are incomplete and the target paper ref is known, the runtime best-effort queries `reference-index get`.

Only references bound to library papers can receive digest artifacts. `paper-artifacts export-filtered` is called with `artifact_types: ["digest"]`. Unbound or external references remain structured references without digest content.

