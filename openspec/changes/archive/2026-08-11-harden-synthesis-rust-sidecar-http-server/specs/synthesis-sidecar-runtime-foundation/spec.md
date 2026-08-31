## ADDED Requirements

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

