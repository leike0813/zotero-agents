## Context

The sidecar listener is nonblocking, but every accepted TCP connection currently receives an unbounded native thread. The synchronous HTTP reader waits in `read_line`/`read_exact` without socket deadlines or header limits, and shutdown joins every handler after clients have had an unlimited opportunity to keep those reads open. The runtime is loopback-only, one-request-per-connection, and dependency-free; the plugin supervisor closes stdin after attempting lifecycle shutdown and grants 500 ms for graceful process exit.

## Goals / Non-Goals

**Goals:**

- Put one explicit bound around accepted sockets, handler threads, request framing, I/O waits, and handler shutdown.
- Preserve normal health, authenticated RPC, compute-transfer capacity, and lifecycle-receipt behavior.
- Keep overload and malformed-request failures request-scoped and observable through existing public error codes.

**Non-Goals:**

- Add keep-alive, pipelining, chunked transfer, an async runtime, or a general request queue.
- Change application deadlines, operation admission, public capabilities, persistence, or subsequent premerge repair stages.

## Decisions

### 1. Keep bounded thread-per-connection with one connection owner

The server loop owns a registry of at most sixteen socket clones. Registration allocates the slot before spawning a handler, and a handler-owned RAII lease removes it on every terminal path. Completed join handles are reaped during normal listener polling. Overflow receives an immediate bounded `503` response on the listener thread.

A fixed worker pool was rejected because handlers can legitimately remain inside operation-specific control work, while a shared connection queue would add latency and a second admission policy. An atomic counter alone was rejected because shutdown also needs concrete sockets to interrupt.

### 2. Parse one bounded HTTP request incrementally

The reader accumulates only the header block, checks the delimiter and line bounds as bytes arrive, validates closed `Content-Length` framing, then allocates at most the declared 8 MiB body. A typed request DTO crosses into capability dispatch; a typed read error owns HTTP status and stable public-code mapping. The existing post-parse 1 MiB production policy remains authoritative for ordinary operations.

Unbounded `BufRead::read_line` and a larger universal JSON limit were rejected because both preserve the allocation and slow-client risks. Chunked transfer remains unsupported because every current caller sends a complete bounded envelope.

### 3. Use both idle and hard read deadlines

Each socket read is bounded by the smaller of the 500 ms idle window and remaining 30 second hard window. Progress restarts only the idle window. Response writes use a two-second socket deadline. Test-only policy injection shortens timing tests without changing production constants.

A socket idle timeout alone was rejected because a trickling client could remain forever. Application deadlines were rejected as the owner because parsing occurs before an operation or manifest policy exists.

### 4. Interrupt sockets before bounded handler drain

On shutdown the listener closes first, the connection owner shuts down all active sockets, and work/transfer admission is stopped so interrupted handlers cannot re-enter expensive work. Finished handlers are joined until the shared 500 ms deadline. Remaining join handles are detached, cleanup reports an incomplete shutdown, and state with outstanding `Arc` owners is not force-closed.

`system.shutdown` writes its small receipt before setting the shared stopping flag; the flag and cleanup still proceed if that write fails. This preserves the existing lifecycle contract without letting other partial sockets delay termination.

## Risks / Trade-offs

- [Sixteen slow clients can temporarily reject legitimate work] → The overload is immediate and retryable at the transport level, while the supervisor's stdin EOF path remains available under saturation.
- [A 500 ms idle limit could reject an unusually stalled local 8 MiB upload] → Loopback clients materialize complete envelopes and the independent 30 second hard deadline still permits continuous transfer.
- [A handler executing application code may outlive socket interruption] → Bounded drain reports incomplete cleanup and avoids closing owners still referenced by that handler; the supervisor retains process escalation.
- [Lifecycle response and stop publication can race] → Response bytes are flushed first, then stopping is published unconditionally.

## Migration Plan

No data migration is required. Deploy the source change with its new runtime tests; rollback restores the previous executable and requires no durable-state conversion. This change remains unarchived until the broader premerge audit is complete.
