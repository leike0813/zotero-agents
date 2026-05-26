## Why

Synthesis Knowledge Graph v1 needs a shared foundation before Topic Graph,
Concept KB, Tag Vocabulary, Citation Registry, or Git Sync can be implemented.
The current Synthesis foundation covers envelopes, hashes, note shards, and
topic artifact persistence, but it does not yet provide a canonical-store
transaction boundary, projection state registry, or debounced change event for
future KG domains.

## What Changes

- Add a minimal Synthesis KG canonical store layout under `synthesis/`.
- Add internal foundation helpers for canonical asset read/write/validation.
- Add a transaction helper that validates inputs, writes through temporary
  assets, records receipts/diagnostics, emits one `canonical-store-changed`
  event per committed transaction, and marks affected projections stale.
- Add a lightweight projection registry state model for stale/rebuild metadata.
- Keep this phase internal-only: no Topic Graph semantics, Concept KB ingest,
  Tag UI, citation matching rewrite, Git remote sync, or new MCP/host bridge
  surface.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-layer-foundation`: extend the existing foundation contract with
  KG canonical store initialization, canonical asset transactions,
  debounced store-change events, and projection registry state.

## Impact

- Affects `src/modules/synthesis/foundation.ts` and focused foundation tests.
- Uses existing runtime persistence abstractions for Zotero/plugin-safe file IO.
- Does not introduce new dependencies, public workflow manifest fields, MCP
  tools, external APIs, or Git operations.
