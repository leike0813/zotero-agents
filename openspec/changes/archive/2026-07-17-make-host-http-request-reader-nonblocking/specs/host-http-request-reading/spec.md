## ADDED Requirements

### Requirement: Host request input is event driven
The unified Host Access listener SHALL acquire request bytes only from `nsIAsyncInputStream.asyncWait()` readiness callbacks dispatched to the main thread. It MUST NOT synchronously wait, poll, busy-spin, use an input-stream pump, or retain a synchronous fallback while waiting for future network data.

#### Scenario: Request arrives in delayed fragments
- **WHEN** a client sends a request header and body in multiple delayed fragments
- **THEN** the reader SHALL re-register a one-shot readiness notification after each incomplete read
- **AND** Zotero main-thread timers SHALL remain able to run between fragments.

#### Scenario: Asynchronous input is unavailable
- **WHEN** an accepted input stream cannot provide the asynchronous input-stream contract
- **THEN** the reader SHALL fail structurally without entering a business handler
- **AND** the Host Access listener SHALL remain running.

### Requirement: Host request framing is strict and bounded
The reader SHALL preserve request bytes exactly, incrementally locate the first header terminator, and complete only when the bytes after that terminator exactly equal a valid `Content-Length`. A missing `Content-Length` SHALL represent an empty body. Transfer encoding SHALL NOT be supported.

#### Scenario: Header delimiter spans fragments
- **WHEN** `\r\n\r\n` spans two readiness callbacks
- **THEN** the reader SHALL recognize the delimiter without losing or duplicating bytes.

#### Scenario: Binary body completes
- **WHEN** the declared body contains arbitrary binary octets and the exact declared byte count arrives
- **THEN** the reader SHALL return those octets unchanged.

#### Scenario: Framing is invalid
- **WHEN** `Content-Length` is invalid, negative, duplicated incompatibly, or the request uses transfer encoding
- **THEN** the reader SHALL reject the request before business dispatch.

#### Scenario: Request exceeds reader limits
- **WHEN** the header exceeds 64 KiB or the declared or received body exceeds 16 MiB
- **THEN** the reader SHALL reject the request before business dispatch.

### Requirement: Host request reads have idle and hard deadlines
The reader SHALL enforce a 500 ms idle deadline and a 30 second total deadline. Each successful non-empty read SHALL restart the idle deadline, while the total deadline SHALL never move.

#### Scenario: Client stops sending bytes
- **WHEN** no new byte arrives for 500 ms before the request is complete
- **THEN** the reader SHALL fail with an idle-timeout classification.

#### Scenario: Client trickles bytes continuously
- **WHEN** bytes arrive often enough to reset the idle deadline but the request remains incomplete for 30 seconds
- **THEN** the reader SHALL fail with a total-timeout classification.

### Requirement: Host request reads have one terminal outcome
Success, timeout, abort, EOF, and read failure SHALL race through a single settlement path. Settlement SHALL cancel timers and readiness callbacks and release the input stream exactly once.

#### Scenario: Shutdown abort races with input
- **WHEN** shutdown aborts a pending reader while a readiness callback is queued
- **THEN** exactly one terminal result SHALL be observed
- **AND** the request SHALL NOT enter a business handler.

#### Scenario: Client closes early
- **WHEN** EOF occurs before the declared request is complete
- **THEN** the reader SHALL fail with an early-EOF classification
- **AND** partial request content SHALL NOT enter a business handler.

### Requirement: Host request failures map without poisoning the listener
Request-scoped read and framing failures SHALL map to the existing Host Bridge error envelope when the peer remains writable, and SHALL NOT change the unified listener state to `error`.

#### Scenario: Request failure remains writable
- **WHEN** a header-limit, body-limit, timeout, framing, asynchronous-stream, or read failure occurs while the peer remains writable
- **THEN** the server SHALL map it respectively to HTTP 431, 413, 408, 400, 500, or 500
- **AND** the listener SHALL remain running.

#### Scenario: Request failure is not writable
- **WHEN** the peer has closed or server shutdown aborted the request
- **THEN** the server SHALL skip response writing and release the connection.

