## 1. Reader Contract and TDD

- [x] 1.1 Add async-input-stream test fakes and failing unit coverage for complete, fragmented, zero-available, and binary requests.
- [x] 1.2 Add failing unit coverage for framing, byte limits, idle/total deadlines, abort, EOF, read errors, and settlement races.
- [x] 1.3 Implement the shared event-driven Host HTTP request reader and structured error/result contract.

## 2. Unified Host Access Integration

- [x] 2.1 Add failing Host Bridge lifecycle tests for immediate accept return, local request failures, single cleanup, partial-upload exclusion, shutdown abort, and stale generations.
- [x] 2.2 Replace the synchronous Host Bridge input path with the shared reader, connection registry, generation ownership, and HTTP error mapping.
- [x] 2.3 Add the fragmented real-socket health, binary upload, MCP JSON-RPC, and heartbeat integration fixture to the Zotero core domain.

## 3. Legacy Removal and Profiling

- [x] 3.1 Remove the unreachable standalone MCP server socket, reader, writer, listener, and watchdog code while retaining active parser/helpers/descriptors.
- [x] 3.2 Extend profiler metrics, baseline mappings, and tests for async waits and maximum callback duration on successful and failed reads.

## 4. Documentation and Verification

- [x] 4.1 Update the Host UI stall risk audit with the unified MCP listener correction, final R2 contract, verification evidence, and remaining boundaries.
- [x] 4.2 Run targeted Node core tests and the complete Node core regression suite.
- [x] 4.3 Run Zotero 7 and Zotero 9 core socket fixtures and record each host result without claiming unrun coverage.
- [x] 4.4 Run lint, build, and OpenSpec validation; resolve all change-related failures.

