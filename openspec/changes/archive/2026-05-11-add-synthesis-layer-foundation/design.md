# Synthesis Layer Foundation Design

## Overview

This change implements only the foundation needed by later Synthesis Layer
phases. It creates reusable primitives for canonical assets, validation, hashes,
note-shard mirrors, local history, local write locking, and optimistic writes.

The implementation must be usable from Node tests and Zotero runtime code. Pure
logic should stay independent from Zotero APIs; Zotero item creation and note
updates are represented by host adapter boundaries so later phases can wire them
to real Zotero items.

## Scope

In scope:

- Canonical JSON envelope parsing, validation, creation, and migration hooks.
- Stable JSON canonicalization and SHA-256 hash formatting.
- Markdown LF normalization for hash inputs.
- Synthesis storage path planning and initial directory/file layout.
- Local-only history and conflict candidate path planning.
- Library-level async write lock.
- Optimistic compare-and-swap decision helper.
- Note shard title formatting/parsing.
- Note shard HTML comment payload rendering/extraction.
- Shard payload encoding/decoding with gzip preferred and `none` fallback.
- Manifest deterministic sorting and hash verification.
- Foundation preferences default model.

Out of scope:

- Paper Registry rows or SQLite cache.
- Unified Citation Graph or graph layouts.
- Synthesis MCP tools.
- `synthesize-topic` workflow and applyResult integration.
- Zotero tab UI or Sidebar fallback.
- Remote MCP support.

## Contracts

Canonical JSON assets use the envelope:

```json
{
  "schema_id": "synthesis.index",
  "schema_version": "1.0.0",
  "created_at": "2026-05-10T12:00:00Z",
  "updated_at": "2026-05-10T12:00:00Z",
  "data": {}
}
```

Foundation schema version starts at `1.0.0`. Assets with unknown fields must be
preserved by the parser result and reported as warnings, not silently stripped.
Workflow result bundles and MCP tool contracts are not implemented in this
change.

All hashes use:

```text
sha256:<lowercase-hex>
```

JSON hash inputs use stable key order and no insignificant whitespace. Markdown
hash inputs normalize CRLF/CR to LF.

## Mirror Encoding

The mirror shard title format is:

```text
ZS Synthesis Mirror [<library-id>] <kind> <seq:000>/<total:000>
```

The visible note body contains only metadata. Machine payload is hidden in an
HTML comment beginning with `ZOTERO_SKILLS_SYNTHESIS_SHARD`.

Shard payload flow:

```text
canonical JSON payload
  -> payload_hash
  -> gzip when available, otherwise none
  -> base64
  -> encoded_hash
```

The decoder must verify `encoded_hash`, decode base64, decompress when
`compression: "gzip"`, verify `payload_hash`, and return the canonical JSON
payload text.

Manifest hashes exclude `manifest_hash` itself and sort shards by fixed kind
order then sequence.

## Write Control

This phase implements reusable write-control primitives, not full workflow
applyResult.

- Local concurrency is guarded by a library-level async lock keyed by
  `libraryId`.
- Cross-machine concurrency is represented by a compare-and-swap helper that
  checks current hashes against result bundle base hashes.
- On mismatch the caller must save a local conflict candidate and must not
  overwrite current assets or refresh the Zotero mirror.

## Testing Strategy

Tests should cover pure logic first so the foundation can be validated without a
full Zotero runtime. Zotero-specific item creation can be tested in a later
integration change after the host adapter is wired.
