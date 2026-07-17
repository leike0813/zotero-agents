## Why

The R2 Host HTTP reader opens accepted streams and then constructs a DOM `AbortController` that is absent from the Zotero plugin sandbox. The resulting uncaught `ReferenceError` prevents request processing and cleanup, so clients receive no bytes and Zotero retains `CLOSE_WAIT` connections.

The current Zotero socket fixture can also treat internal request counters as a successful response, masking exactly this production failure. The connection lifecycle and its acceptance oracle must be repaired before release.

## What Changes

- Replace the DOM cancellation dependency with a reader-owned cancelable operation built only from Zotero-safe primitives.
- Make accepted-connection initialization exception-safe and generation-owned from the first opened stream.
- Restore stream-owned successful response completion instead of immediately closing the transport after output close.
- Require real response bytes in Zotero socket integration tests and cover plugin runtimes without a global `AbortController`.
- Correct the R2 audit evidence and repeat cold-start CLI acceptance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-http-request-reading`: Require Zotero-safe cancellation/runtime dependencies and byte-observed response acceptance.
- `host-bridge-lifecycle-and-status`: Require exception-safe accepted-connection initialization and distinct success versus abort cleanup.

## Impact

The change is limited to the Host HTTP reader, unified Host Access listener lifecycle, their focused tests, OpenSpec deltas, and the R2 audit record. HTTP routes, authentication, response DTOs, MCP behavior, persistence, and the Rust CLI remain unchanged; no CLI rebuild is required.
