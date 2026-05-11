# Add Synthesis Layer Foundation

## Why

Synthesis Layer v1 needs a stable local asset foundation before Paper Registry,
Unified Citation Graph, MCP tools, workflow generation, or UI work can be built.
Without a shared schema, hash, storage, mirror, and write-conflict contract, later
phases would need to make storage decisions repeatedly and risk incompatible
assets.

## What Changes

- Add the Synthesis Layer foundation capability for canonical JSON envelopes,
  SHA-256 hashing, storage root layout, local write locking, optimistic
  compare-and-swap, and Zotero anchor/note-shard mirror encoding.
- Define v1 foundation scope as personal-library only.
- Define note shards as Zotero-synced mirrors, not canonical truth.
- Define local history and conflict candidates as local-only assets that do not
  participate in sync mirrors.
- Add preferences and status modeling for storage root, mirror, auto-watch, and
  rebuild settings.
- Exclude Paper Registry construction, Unified Citation Graph construction,
  synthesis MCP tools, ACP Skills workflow execution, and Synthesis UI from this
  foundation change.

## Capabilities

### New Capabilities

- `synthesis-layer-foundation`: Foundation contracts for Synthesis Layer
  canonical assets, schemas, hashes, note-shard mirror encoding, storage state,
  local history, write locking, and conflict handling.

### Modified Capabilities

None.

## Impact

- Adds Synthesis Layer foundation modules under `src/modules/synthesis/`.
- Adds schema and validation helpers backed by Ajv.
- Adds pure foundation tests under `test/core/`.
- Adds no UI, workflow package, MCP tools, graph dependencies, or SQLite tables
  in this change.
- Does not change existing Zotero raw item behavior or existing workflow payload
  marker behavior.
