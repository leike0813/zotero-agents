# Synthesis Paper Registry Design

## Overview

Paper Registry is a local materialized projection. It is not canonical sync
state. The source of truth remains Zotero metadata plus existing derived
artifact payload notes and attachments.

This change implements the projection model and pure builder. The builder takes
host-provided paper summaries and note payload HTML and returns deterministic
registry rows with artifact availability, hashes, readiness, and diagnostics.
The later MCP/UI changes can query this model or persist it into the dedicated
local `synthesis-layer.db`.

## Inputs

The builder consumes DTOs, not raw Zotero objects:

- `libraryId`
- `itemKey`
- `title`
- `year`
- `itemType`
- `tags`
- `collections`
- child note payload candidates

Derived artifacts are discovered through existing hidden payload markers parsed
by `notePayloadCodec`.

Recognized payload types:

- `digest-markdown`
- `references-json`
- `citation-analysis-json`

## Outputs

Each row contains:

- stable paper ref: `libraryId:itemKey`
- Zotero metadata summary
- tag and collection membership
- artifact availability by type
- artifact hash and updated timestamp when available
- readiness and coverage status
- diagnostics

Artifact hashes are computed from decoded payload content:

- Markdown payloads use normalized Markdown SHA-256.
- JSON payloads use canonical JSON SHA-256.
- Visible note HTML, titles, and rendered tables are ignored.

## Diagnostics

The registry should distinguish:

- payload missing
- payload decode failed
- payload schema invalid
- unsupported payload version
- duplicate payload candidates

Duplicates should not abort the whole registry rebuild. The first valid
candidate in deterministic note order is selected, and diagnostics preserve the
duplicate count.

## Cache Boundary

This change defines the local cache boundary but does not make SQLite a sync
truth:

- Registry cache belongs in a dedicated local `synthesis-layer.db`.
- It can be deleted and rebuilt.
- It is not written into canonical assets.
- It is not mirrored into Zotero note shards.

Actual watcher/debounce and MCP exposure are later changes.
