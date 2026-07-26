## Context

R2 replaced the synchronous busy-spin reader with `nsIAsyncInputStream.asyncWait()`, but the accepted-socket path constructs a DOM `AbortController` after opening both streams and outside its cleanup guard. Zotero's plugin global does not expose that constructor, so the first connection throws before registration or request deadlines begin. The same integration also closes the transport immediately after closing the response stream and uses an internal-state fallback when no response bytes are observed.

## Goals / Non-Goals

**Goals:**

- Keep request acquisition event-driven on Zotero's main thread.
- Make every partially initialized accepted connection recoverable.
- Preserve complete response delivery and bounded generation-owned cleanup.
- Make tests fail whenever a real socket client receives no response bytes.

**Non-Goals:**

- Change routes, auth, response DTOs, MCP semantics, request limits, or persistence.
- Add keep-alive, chunked transfer, connection admission control, or a new asynchronous response writer.
- Change or rebuild the Rust CLI.

## Decisions

### Return a reader-owned cancellation handle

`beginHostHttpRequestRead()` returns an operation containing `completion` and an idempotent `abort()`. Cancellation enters the same settlement function as timeout, EOF, and read failure. This avoids a DOM global and avoids introducing a generic cancellation abstraction or coupling Host Bridge to UI/window lifecycles.

Using `Zotero.getMainWindow().AbortController` is rejected because connection correctness must not depend on an open UI window or a cross-realm DOM object.

### Resolve the callback target from XPCOM

The reader obtains the main-thread event target from `@mozilla.org/thread-manager;1` using the same XPCOM component environment as its binary input stream. Missing async runtime support remains a structured request-local 500; no synchronous fallback is permitted.

### Separate successful release from abort cleanup

Connection initialization opens streams, creates the read operation, and registers ownership inside one guarded sequence. Abort cleanup cancels the reader and closes output plus transport exactly once. Successful response completion closes the output stream and only removes the registry entry; it does not immediately close the transport, restoring the pre-R2 stream-owned response behavior and avoiding a drain race.

### Require bytes as the socket-test oracle

The Zotero fixture must parse a complete raw response. `requestCount` and `lastResponseStatus` remain diagnostics only and cannot substitute for bytes received by the client.

## Risks / Trade-offs

- [Risk] XPCOM main-thread lookup differs across Zotero versions. → Use the stable thread-manager service and run the same fixture in Zotero 7 and 9 when both hosts are available.
- [Risk] Output close can still expose pre-existing nonblocking-writer limitations for unusually large responses. → Preserve the known response serializer in this repair; treat a general async output writer as a separate measured change.
- [Risk] Abort, callback, and handler completion race. → Keep first-settlement-wins reader cleanup and generation checks, and test pending shutdown plus stale listeners.
- [Risk] A partial response write cannot safely be retried. → Abort the connection without attempting a second HTTP response.

## Migration Plan

Implement behind the existing listener without a compatibility branch, run focused Node and Zotero fixtures, then cold-restart Zotero and probe with CLI 0.2.1. Roll back the atomic lifecycle integration if real-host response bytes or connection cleanup regress; do not restore the synchronous reader.

## Open Questions

None.
