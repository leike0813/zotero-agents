## Context

ACP Chat and ACP Skills share the same append-only transcript event model but currently reach durability through different high-frequency paths. Skills uses a short private batch while Chat chains a persistence promise for each event; the shared store appends JSONL and rewrites its derived index for each call. The audit trail is more expensive: its apparent append reads the full existing file and rewrites the concatenation. Streaming ACP updates can therefore produce O(N) growing writes and promise bookkeeping.

Transcript JSONL remains persistence truth and may lose at most the configured live tail window on an abnormal process crash. The adjacent index is derived state. Debug audit is best-effort evidence and cannot participate in transcript correctness. UI live mirrors and deltas must remain synchronous, and transcript-only activity must not rebuild non-transcript Assistant Workspace regions.

## Goals / Non-Goals

**Goals:**

- Reduce burst and sustained transcript, index, metadata, and plugin-owned audit physical writes to bounded low-frequency batches.
- Provide owner-scoped durability barriers without forcing unrelated owners to drain.
- Preserve immediate live transcript visibility, exact event ordering, page semantics, and lifecycle durability.
- Make index recovery safe after partial checkpoints, old index versions, truncation, or checkpoint failure.
- Keep audit failures isolated from ACP execution while retaining failed pending batches for boundary retry.

**Non-Goals:**

- Changing transcript page DTOs, ACP protocol/update projection, workflow manifests, backend contracts, or UI rendering.
- Migrating or rewriting historical transcript JSONL.
- Buffering low-frequency prompt, stderr, runtime-log, run, or final-state snapshots.
- Taking ownership of Rust bridge `bridge.ndjson`.
- Adding dependencies or making debug audit a correctness source.

## Decisions

### Use one business-agnostic buffered-write coordinator

The coordinator owns per-key pending entries, bytes, one timer, one active drain, and one shared durability promise. It drains after approximately two seconds from the first entry, at 128 KiB, or at 256 entries. Entries arriving during a drain form the next batch. It exposes key, owner, and global flush operations plus test diagnostics and reset.

Sinks retain domain semantics: the transcript sink serializes/coalesces events and checkpoints indexes; the audit sink sanitizes before enqueue and appends every record. This avoids turning a scheduling utility into a transcript/index/audit god module. Separate bespoke timers were rejected because they duplicate concurrency and barrier correctness.

### Apply transcript state synchronously and persist asynchronously

ACP Chat and ACP Skills update their bounded in-memory mirror, revisions, counts, previews, and live deltas when an event arrives, then enqueue persistence through the same owner-scoped writer. Adjacent `append_text` events for the same item and compatible field are coalesced only within a batch, preserving concatenated text order and using the highest logical sequence.

Callers observe one shared durability promise per owner rather than one promise per chunk. Reads and lifecycle boundaries flush the target owner before accessing durable state. Unrelated owners are not flushed, and owner-first selection paint precedes background release flushes.

### Checkpoint a rebuildable v2 index

Index v2 records `sourceByteLength` and checkpoint time. Normal writes checkpoint no more often than every 30 seconds or after another 1 MiB of durable JSONL, while durability boundaries force a checkpoint. A valid v2 index whose source length is behind JSONL incrementally folds the tail; a longer source length, malformed index, or v1 index triggers a complete JSONL rebuild.

JSONL append success is independent of index checkpoint success. A checkpoint failure marks the index dirty and is retried at the next boundary. Treating index writes as part of every append was rejected because the index is derived and caused the dominant write amplification.

### Throttle only soft live metadata

Skills transcript-only, usage, workspace activity, and non-terminal tool updates and Chat soft tool/status side channels use a trailing approximately two-second metadata persist. User messages, plan, new tool calls, permission/interaction, terminal state, apply, disconnect, end, and archive remain immediate boundaries. Stable lifecycle identities skip duplicate event-row replacement.

### True-append plugin audit batches

`timeline.ndjson`, `acp-updates.ndjson`, and `transport.ndjson` use the coordinator and one append primitive per batch. Sanitization/redaction happens before enqueue. A failed batch remains pending and emits one structured failure per physical attempt; the run continues. Prompt/turn terminal, close/disconnect, run terminal, diagnostics completion, and shutdown force the relevant audit owner.

Low-frequency snapshot files retain boundary writes. `bridge.ndjson` remains an externally owned stream so plugin buffering cannot reorder or compete with Rust bridge writes.

## Risks / Trade-offs

- [Abnormal termination can lose the live tail] → Bound the timer to approximately two seconds and force durability at all semantic boundaries.
- [A sink failure can retain memory] → Keep retries boundary-driven, expose diagnostics, and use existing bounded shutdown waiting with structured timeout/failure reporting.
- [Coalescing can alter event-level offsets] → Coalesce only adjacent compatible text appends, retain the highest sequence, and validate offsets, previews, pages, and final text.
- [Index checkpoint lag can make reads more expensive] → Flush target JSONL and incrementally fold from `sourceByteLength`; rebuild only for invalid, old, or truncated state.
- [Shared scheduling can couple domains] → Isolate keys and owners and keep transcript/index/audit behavior in separate sinks.

## Migration Plan

No transcript JSONL migration is performed. Existing v1 or invalid indexes are ignored and rebuilt into v2 on first read or durability boundary. Rollback may discard v2 index files because JSONL remains canonical. No dependency, database schema, UI DTO, or backend migration is required.

## Open Questions

None.
