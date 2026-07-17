## ADDED Requirements

### Requirement: Host request cancellation is runtime independent
The Host HTTP reader SHALL expose a reader-owned, idempotently cancelable operation and MUST NOT require DOM, Window, or Node cancellation globals. It SHALL dispatch readiness callbacks to the Zotero main-thread XPCOM event target and MUST NOT introduce a synchronous fallback.

#### Scenario: DOM AbortController is unavailable
- **WHEN** the unified Host Access listener accepts a request in a Zotero plugin runtime without a global `AbortController`
- **THEN** the request SHALL still be read through readiness callbacks and reach its handler
- **AND** cancellation SHALL remain available to listener shutdown.

#### Scenario: Main-thread async runtime is unavailable
- **WHEN** the reader cannot resolve the asynchronous input stream or the main-thread event target
- **THEN** it SHALL fail structurally without entering a business handler
- **AND** the listener SHALL remain running without using a synchronous fallback.

### Requirement: Socket acceptance requires client-observed response bytes
Real-socket acceptance evidence SHALL require a complete HTTP response received by the client. Internal request counters, handler logs, or last-response status MUST NOT substitute for missing response bytes.

#### Scenario: Handler records success but client receives no bytes
- **WHEN** internal state records request handling but the socket client receives no complete HTTP response
- **THEN** the integration fixture SHALL fail.

