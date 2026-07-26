## Context

The unified Host Access listener serves both `/bridge/v1/*` and `/mcp` from `hostBridgeServer.ts`. Its accepted-socket path currently invokes a synchronous request reader that repeatedly checks `available()` for up to 500 ms, blocking Zotero's single JavaScript main thread when a request is fragmented. `zoteroMcpServer.ts` also retains an unreachable standalone socket implementation even though production MCP routing already uses the Host Bridge listener.

The replacement must work in Zotero 7 and 9, preserve byte-exact bodies and public protocol behavior, keep route-specific 1 MiB/16 MiB validation in the Host Bridge handler, and avoid Node-only APIs.

## Goals / Non-Goals

**Goals:**

- Make request acquisition purely readiness-event-driven.
- Centralize framing, deadlines, limits, cancellation, and read diagnostics.
- Give the listener generation explicit ownership of accepted connections.
- Preserve Host Bridge, CLI, and MCP request/response semantics.
- Remove unreachable MCP socket infrastructure and extend existing profiler evidence.

**Non-Goals:**

- Change response writing, keep-alive, transfer encoding, route DTOs, or Rust CLI behavior.
- Add an accepted-connection count limit or broader backpressure policy.
- Make the cold reader cache or any other new persistence format authoritative.

## Decisions

### Use `nsIAsyncInputStream.asyncWait()` as the only readiness mechanism

The reader casts the accepted input to `nsIAsyncInputStream`, registers a one-shot callback on `Services.tm.mainThread`, reads only the bytes currently reported by `available()`, then registers again if the request is incomplete. This keeps future network waiting outside synchronous JavaScript. `nsIInputStreamPump` and a synchronous fallback are rejected because they either obscure request framing ownership or preserve the blocking path.

### Parse framing incrementally and join once

The reader keeps immutable byte fragments and an incremental four-byte delimiter match state. It parses the header once the delimiter arrives, validates framing and declared length, and concatenates the complete request only at success. This avoids repeatedly copying the entire accumulated request while preserving arbitrary body octets.

The reader accepts no body when `Content-Length` is absent, rejects any transfer encoding, enforces a 64 KiB header ceiling and a 16 MiB transport-body ceiling, and succeeds only at the exact declared byte count. Route-level limits remain the handler's SSOT.

### Separate idle and total deadlines

One 500 ms idle timer is restarted only after a non-empty read. One 30 second total timer starts once and never moves. Timer, readiness, EOF, abort, and read-error paths all enter the same idempotent settlement function, which detaches cancellation hooks, cancels pending readiness notification, clears timers, and closes input.

### Own accepted connections by listener generation

`hostBridgeServer` records each accepted transport, its abort controller, and its generation before starting asynchronous request processing. The listener callback returns immediately after registration. Shutdown/restart closes the listener and aborts/closes every accepted connection; request cleanup uses one `finally` path and removes only its own registry entry. Listener-level callbacks compare generations before changing state or scheduling recovery.

Request failures are local: 431 for header size, 413 for body size, 408 for either deadline, 400 for invalid framing or writable early EOF, and 500 for missing async support or underlying read failure. Peer-close and shutdown-abort skip response writing.

### Keep MCP as a route, not a server

The production MCP parser/handler and public descriptor remain. Standalone socket/listener/reader/writer/watchdog members in `zoteroMcpServer.ts` are removed because the Host Bridge listener is already the sole socket owner required by the active specs.

### Extend bounded profiler vocabulary

Reader results expose byte, fragment, wait, duration, and maximum callback-duration aggregates. Host Bridge records them for success and structured failure using existing bounded labels and debug-only compilation guards. Historical `host_input_unavailable` baseline entries remain readable, but the new reader does not emit them.

## Risks / Trade-offs

- [Risk] XPCOM async stream behavior differs between Zotero 7 and 9. → Keep the implementation on stable `nsIAsyncInputStream`/main-thread APIs and require the same fragmented socket fixture in both hosts.
- [Risk] A callback, timer, and abort can race. → Route every terminal path through first-settlement-wins cleanup and test race combinations.
- [Risk] A peer may close before an HTTP error can be written. → Classify peer close and shutdown abort as cleanup-only outcomes; response failure never poisons listener state.
- [Risk] Existing unit mocks may model only synchronous input streams. → Add a focused async stream fake and update Host Bridge socket mocks without adding a production fallback.
- [Risk] Removing legacy MCP members can disturb test-only helpers. → Retain exported parser/failure helpers and descriptor fields, then run existing MCP suites.

## Migration Plan

1. Add failing reader and lifecycle tests.
2. Add the shared reader and atomically replace the Host Bridge accepted-socket path.
3. Remove unreachable MCP socket code and update profiler mappings/tests.
4. Run Node core, Zotero 7/9 socket fixtures, lint, build, and OpenSpec validation.
5. If host verification exposes an XPCOM incompatibility, revert the atomic reader integration rather than restore a runtime dual path.

## Open Questions

None. The idle deadline, hard deadline, byte limits, lack of connection cap, and protocol boundaries are fixed by this change.
