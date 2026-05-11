# Add Synthesis Paper Registry

## Why

Synthesis workflows need a fast, deterministic view of Zotero papers and existing
derived artifacts before resolver diagnostics, missing-artifact planning, and
topic synthesis can be reliable. The registry must be rebuildable from Zotero
metadata and workflow payload notes, so it does not become another sync truth.

## What Changes

- Add a Paper Registry projection that can be rebuilt from Zotero metadata,
  tags, collections, and existing derived artifact payload notes.
- Reuse existing `data-zs-payload` note payload markers for `digest-markdown`,
  `references-json`, and `citation-analysis-json`.
- Compute artifact hashes from decoded payload canonical content, not visible
  note HTML.
- Add diagnostics for missing, invalid, duplicate, and unsupported payloads.
- Add a local-only registry cache boundary for later independent SQLite storage.
- Exclude Unified Citation Graph construction, resolver execution, MCP tools,
  and UI table rendering from this change.

## Capabilities

### New Capabilities

- `synthesis-paper-registry`: Rebuildable Paper Registry projection over Zotero
  metadata and paper-level derived artifact payloads.

### Modified Capabilities

None.

## Impact

- Adds registry projection helpers under `src/modules/synthesis/`.
- Adds core tests for registry rows, artifact availability, hashes, and
  diagnostics.
- Reuses existing `notePayloadCodec` and does not change existing workflow note
  payload formats.
- Does not write registry rows into canonical sync assets or Zotero note shards.
