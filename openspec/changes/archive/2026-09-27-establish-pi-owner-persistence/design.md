# Design

## Context

C01 established only transient execution. ADR 0001 makes the project-owned per-owner JSONL the sole history authority. The current repository provides `runtimePersistence.ts` for late-bound Node/Zotero file I/O and `pluginStateStore.ts` for the profile-local SQLite connection. The accepted ticket's `test/core` paths are stale; current tests live under `tests/runtime` and `tests/zotero/core/lite`.

## Decisions

1. Store each opaque owner ID under `data/pi/owners/<kind>/<id>/`. The first JSONL line is a versioned owner header. Subsequent lines contain a store-assigned sequence, stable entry/turn IDs, optional parent ID, timestamp, kind, and strict-JSON payload. No SDK objects, credentials, or per-entry hashes are serialized.
2. Serialize writes per owner. Append canonical JSONL first, then a payload-free byte-offset sidecar, then the single SQLite owner projection. A failed projection reports committed canonical data as pending, and explicit rebuild derives it from the log. Same entry ID and content is idempotent; changed content conflicts.
3. Validate header, sequence, entry uniqueness, parent linkage, JSON shape, and newline commit boundary. A partial final line is an uncommitted torn tail; middle corruption, committed malformed lines, and missing parents block writes. Explicit repair first checks the file size, then atomically replaces it with valid lines plus a repair fact. No repair runs at startup in C02.
4. Reads use indexed byte ranges, count and byte budgets, and a stable sequence cursor. An invalid or lagging index is rebuilt from the log. The registry is one discriminated table containing only rebuildable owner scalars. Product-specific owner lifecycle and branch selection arrive later.
5. Reuse the existing strict-JSON validator and runtime file APIs. Tests share browser-safe behavior, while Node tests inject projection and corruption faults. The real Zotero test imports the same behavior through the existing core-lite runner.

## Limits

An entry is at most 1 MiB serialized. A page defaults to 80 entries, permits at most 200, and reads at most 4 MiB. Larger semantic content belongs behind later references. C02 does not perform owner startup reconciliation, compaction, retention, deletion, or automatic external-effect recovery.
