## Why

ACP transcript persistence currently turns each streaming chunk into separate JSONL and derived-index writes, while plugin-owned debug audit append paths read and rewrite the entire growing file. These high-frequency paths create write amplification, unbounded promise bookkeeping, and avoidable main-thread I/O during long ACP sessions.

## What Changes

- Introduce a shared owner/file-scoped buffered-write coordinator with bounded time, byte, and entry thresholds plus explicit owner and global durability barriers.
- Batch ACP Chat and ACP Skills transcript JSONL writes while preserving immediate in-memory mirror, revision, count, preview, and live-delta updates.
- Coalesce adjacent compatible transcript `append_text` operations within a physical batch without changing transcript semantics.
- Replace the transcript index with a rebuildable v2 checkpoint containing source byte length, supporting incremental tail recovery and bounded checkpoint frequency.
- Throttle soft live metadata persistence while forcing transcript, index, and metadata durability at user-visible and lifecycle boundaries.
- Batch plugin-owned debug audit NDJSON streams through true append operations; retain every sanitized record and preserve best-effort failure semantics.
- Drain pending transcript, metadata, and audit writes during controlled shutdown. Rust-owned `bridge.ndjson` and low-frequency boundary snapshots remain outside the buffered audit writer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-skill-run-file-backed-runtime-state`: Define buffered live transcript durability, rebuildable index checkpointing, metadata throttling, and boundary flush behavior.
- `acp-chat-file-backed-transcript-state`: Define the shared owner-scoped persistence scheduler, target-only flush semantics, lifecycle boundaries, and shutdown drain for Chat and Skills.
- `acp-skillrunner-compatible-runner`: Define low-frequency physical writes for plugin-owned debug audit streams, boundary flushes, and best-effort retry behavior.

## Impact

The change affects the shared ACP transcript store, ACP Skills and ACP Chat persistence orchestration, plugin-owned ACP audit trail, lifecycle shutdown paths, and their focused core tests. It does not change transcript page DTOs, UI rendering contracts, ACP protocol behavior, workflow manifests, backend contracts, historical transcript JSONL, or dependencies.
