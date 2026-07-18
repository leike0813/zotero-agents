## Why

The unified Host Access listener currently waits synchronously for fragmented request bytes for up to 500 ms on Zotero's main thread. Slow or split Host Bridge and MCP requests can therefore block timers and UI work, while duplicated legacy MCP socket code obscures the listener's actual ownership model.

## What Changes

- Replace the synchronous Host HTTP socket reader with one shared, event-driven `nsIAsyncInputStream.asyncWait()` reader.
- Define strict framing, timeout, size, EOF, abort, and single-settlement behavior for Host Bridge and MCP request input.
- Track accepted connections by listener generation so shutdown and restart reclaim pending reads without allowing stale callbacks to corrupt the new server state.
- Preserve Host Bridge routes, authentication, handler DTOs, CLI behavior, MCP JSON-RPC semantics, one-request-per-connection behavior, and existing route-level body limits.
- Remove the unreachable standalone MCP socket/reader/writer implementation while retaining the shared MCP parser, test helpers, and public descriptor surface.
- Extend the debug-only ACP runtime profiler with async wait and callback-duration input metrics.

## Capabilities

### New Capabilities

- `host-http-request-reading`: Event-driven, bounded, abortable HTTP request acquisition for the unified Host Access listener.

### Modified Capabilities

- `host-bridge-lifecycle-and-status`: Shutdown, restart, and listener generations also own accepted connections and pending request readers.
- `acp-runtime-performance-profiler`: Host input profiling records asynchronous waits and maximum callback duration without changing release-build elision.

## Impact

- Affected runtime modules: `hostBridgeServer`, the new shared request reader, `zoteroMcpServer`, and ACP runtime profiler/baseline mappings.
- Affected tests: request-reader unit tests, Host Bridge socket/lifecycle integration tests, existing Host Bridge and profiler suites, and Zotero domain filtering.
- Affected documentation: the R2 Host UI stall risk audit and this OpenSpec change.
- No dependency, Rust CLI, public response DTO, MCP tool protocol, or response-writer change is introduced.
