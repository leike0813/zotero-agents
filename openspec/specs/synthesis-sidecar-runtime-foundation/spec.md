# synthesis-sidecar-runtime-foundation Specification

## Purpose

Define the native Rust runtime foundation, explicit loopback protocol, and durable application composition.

## Requirements

### Requirement: Runtime foundation SHALL be the native Rust application

The independent packageable sidecar SHALL be the Rust executable and SHALL
implement the strict loopback health, authenticated call, full capability,
isolated repository/canonical, mutation-disabled, bounded transport, and
lifecycle contracts without a Node runtime. Its loopback HTTP boundary SHALL
return health success for a complete explicit GET request, unauthorized for a
complete request carrying an invalid bearer token, and invalid-request for a
malformed payload carrying a valid bearer token.

#### Scenario: Durable smoke sends explicit loopback frames
- **WHEN** a durable candidate is checked before packaging
- **THEN** the smoke SHALL send complete raw TCP HTTP/1.1 frames for health,
  invalid-token, and malformed-payload requests; it SHALL parse the HTTP status
  and response body, and include the body when a status assertion fails

### Requirement: Native loopback HTTP admission SHALL be bounded

The native sidecar SHALL admit at most sixteen active HTTP connections. A connection that arrives while all slots are occupied MUST receive HTTP `503` with public code `service_unavailable` without entering a wait queue or creating another handler thread. Every terminal handler path, including panic and transport failure, MUST release its slot.

#### Scenario: Partial connections saturate admission
- **WHEN** more than sixteen clients hold incomplete loopback requests open
- **THEN** at most sixteen connections own handler capacity
- **AND** every additional connection is rejected without growing the handler-thread count

#### Scenario: Capacity is released
- **WHEN** admitted connections complete, fail, time out, or are interrupted
- **THEN** their slots become available to later health and call requests
- **AND** the listener remains ready unless lifecycle shutdown has begun

### Requirement: Native loopback HTTP framing SHALL be strict and bounded

The native sidecar SHALL accept one HTTP/1.1 request per connection. A request line or individual header line MUST NOT exceed 8 KiB, aggregate request headers MUST NOT exceed 64 KiB, and the declared or received body MUST NOT exceed the existing 8 MiB transport maximum. `Content-Length` MUST be an unsigned decimal integer; duplicate values MUST agree; transfer encoding MUST be rejected. These transport bounds MUST NOT weaken the existing 1 MiB ordinary production-request limit.

#### Scenario: Request headers exceed a bound
- **WHEN** a request line, header line, or aggregate header block exceeds its applicable bound
- **THEN** the server returns HTTP `431` with public code `invalid_request`
- **AND** no authentication or business handler runs

#### Scenario: Request body exceeds the transport bound
- **WHEN** `Content-Length` declares more than 8 MiB or received bytes exceed the accepted framing
- **THEN** the server returns HTTP `413` with public code `request_body_too_large`
- **AND** no body-sized allocation or business dispatch occurs for the rejected request

#### Scenario: Request framing is ambiguous
- **WHEN** content lengths conflict, content length is invalid, or transfer encoding is present
- **THEN** the server returns HTTP `400` with public code `invalid_request`
- **AND** the connection is closed after the response

### Requirement: Native loopback HTTP I/O SHALL have idle and total deadlines

Incomplete request reads SHALL have a 500 ms idle deadline and a non-resetting 30 second total deadline. Response writes SHALL have a 2 second deadline. Timeout or write failure MUST terminate only that request, release its admission slot, and MUST NOT append a second response after any response bytes have been written.

#### Scenario: A client stops sending a request
- **WHEN** an admitted client sends no new byte for 500 ms before its request is complete
- **THEN** the server returns HTTP `408` with public code `request_timeout` when the peer remains writable
- **AND** a later valid request can still be served

#### Scenario: A client trickles a request indefinitely
- **WHEN** an incomplete request continues making progress but reaches 30 seconds total read time
- **THEN** the request terminates with the same timeout classification
- **AND** its connection capacity is released

#### Scenario: A peer does not receive a response
- **WHEN** response writing cannot make progress within 2 seconds
- **THEN** the handler closes the connection and terminates without retrying the business operation or writing another envelope

### Requirement: Production serve lifecycle SHALL have one process owner

The native Rust sidecar SHALL expose one blocking production-serve lifecycle that accepts the existing launch-config path, owns startup through terminal cleanup, and reports a typed terminal outcome without changing the executable or wire contracts.

#### Scenario: Startup fails before readiness
- **WHEN** config validation, production ownership, storage preparation, application composition, reconciliation, listener binding, or discovery publication fails
- **THEN** the sidecar SHALL NOT remain discoverable
- **AND** every resource already acquired SHALL receive failure-isolated rollback
- **AND** the original startup failure SHALL remain the primary terminal cause

#### Scenario: Sidecar commits readiness
- **WHEN** production ownership, storage, applications, reconciliation, and the loopback listener are all usable
- **THEN** the sidecar SHALL atomically publish discovery as its readiness commit
- **AND** stdout notification SHALL remain diagnostic rather than a readiness fact source

#### Scenario: Lifecycle infrastructure fails after readiness
- **WHEN** the listener, admission ownership, runtime ownership, or lifecycle coordination fails after discovery publication
- **THEN** the sidecar SHALL stop accepting new work and enter the shared bounded cleanup path
- **AND** the lifecycle failure SHALL remain observable as the primary terminal cause

#### Scenario: One operation fails
- **WHEN** one request, transfer attempt, worker operation, or background operation terminates with an operation-scoped failure
- **THEN** that operation SHALL reach its stable terminal state and release its admission
- **AND** the listener SHALL remain ready unless a lifecycle stop has independently begun
