## Context

Runtime persistence presents asynchronous functions, but Zotero append and
random range reads currently fall through to synchronous Components streams.
Transcript recovery additionally materializes the full JSONL and repeatedly
clones the complete derived index. The repository targets Zotero 7/9 and
Firefox 115+, where privileged workers expose synchronous random reads without
blocking the chrome main thread and `IOUtils` provides asynchronous append.

## Goals / Non-Goals

**Goals:**

- Remove synchronous append and range reads from Zotero runtime paths.
- Bound cross-thread range transfer objects and transcript scanning memory.
- Make transcript index application linear while preserving stored formats,
  order, previews, and durability boundaries.
- Provide deterministic worker error, timeout, restart, and shutdown behavior.

**Non-Goals:**

- Change public ACP Chat/Skills transcript DTOs or cursors.
- Rewrite historical JSONL or migrate index v2.
- Govern R8 runtime-log serialization or other audit sanitization costs.
- Add Zotero 7 locally when it is not installed.

## Decisions

1. Zotero append uses a per-path promise queue and sequential 256 Ki UTF-16
   code-unit `IOUtils.writeUTF8(..., { mode: "appendOrCreate" })` chunks.
   Surrogate pairs are kept intact. This preserves order across concurrent
   callers and bounds oversized single-entry encoding work. Node retains
   `fs.appendFile` behind the same queue.

2. Indexed range reads use one lazy `ChromeWorker` loaded from a packaged
   chrome URL. Each batch contains at most 1024 ranges and 2 MiB of requested
   bytes, opens the file once, clamps reads to EOF, and packs all bytes into one
   transferable `ArrayBuffer` plus a length vector. A single range larger than
   the byte budget is isolated rather than truncated.

3. The main worker client owns request IDs, a generation, a 30-second timeout,
   and pending promises. Worker error or timeout rejects the generation and
   terminates it; a later request creates a fresh generation. Controlled
   shutdown rejects pending work and prevents restart.

4. Complete and tail index recovery use 256 KiB byte reads and raw newline
   detection. The scanner retains byte fragments only for a line crossing a
   chunk, so offsets remain UTF-8 byte offsets and long lines do not cause
   repeated whole-prefix concatenation.

5. One ordered mutable map applies a complete scan or an existing-index batch.
   It clones an existing index once, applies events in O(1) expected lookup
   time, and finalizes immutable arrays once. Page hydration parses and folds
   at most 64 events before yielding to the host.

Alternatives rejected by Zotero probes were one `IOUtils.read` per range,
reading broad covering windows, returning one transferable per range, and
whole-string asynchronous append for oversized batches.

## Risks / Trade-offs

- **Worker capability is unavailable** → Return a structured non-retry-looping
  runtime I/O error; never silently restore synchronous Components I/O.
- **A corrupt index requests excessive data** → Normalize ranges, enforce
  entry/byte batch budgets, and clamp reads to the worker-observed file size.
- **A single canonical event exceeds the byte budget** → Isolate it and
  preserve data; do not truncate business transcript content.
- **Worker stalls or exits** → Timeout/error invalidates the complete
  generation and the next call lazily recreates it.
- **Shutdown races with page hydration** → Session and persistence drains run
  before the worker shutdown hook; late requests fail structurally.

## Migration Plan

No stored-data migration is required. Deployment replaces the runtime backend
and derived-index algorithm in place. Rollback can restore the previous code
because JSONL and index v2 remain unchanged.

## Open Questions

None. Zotero 7 true-host execution remains an external verification item, not
an implementation decision.
