## ADDED Requirements

### Requirement: Compute transport has independent bounded envelopes
The sidecar SHALL limit complete UTF-8 JSON envelopes to 8 MiB for compute
requests and responses while general and system requests remain limited to
1 MiB.

#### Scenario: Compute request fits the dedicated envelope
- **WHEN** an authenticated compute call has a complete UTF-8 envelope no larger than 8 MiB
- **THEN** the service accepts it for capability and DTO validation

#### Scenario: Non-compute request exceeds its unchanged envelope
- **WHEN** a general or system call exceeds 1 MiB but not 8 MiB
- **THEN** the service rejects it with `request_body_too_large` and does not dispatch it

### Requirement: Oversized requests are rejected before dispatch
The compute client and service SHALL enforce the request byte limit before the
request can consume worker scheduling capacity.

#### Scenario: Client preflight rejects an oversized request
- **WHEN** the serialized compute request exceeds 8 MiB
- **THEN** the client returns `request_body_too_large` without opening an HTTP request

#### Scenario: Content length exceeds the absolute endpoint limit
- **WHEN** a request declares a valid `Content-Length` greater than 8 MiB
- **THEN** the service responds with HTTP 413 before collecting the body

#### Scenario: Chunked request crosses the limit
- **WHEN** a chunked request accumulates more than 8 MiB
- **THEN** the service stops collecting it, returns `request_body_too_large`, and never dispatches it

### Requirement: Compute JSON structure remains bounded
The service SHALL limit compute request JSON to 250,000 structural nodes and
compute response JSON to 50,000 structural nodes while retaining depth 32 and
64 KiB single-string limits.

#### Scenario: Byte-valid request exceeds structural capacity
- **WHEN** a compute request is within 8 MiB but exceeds 250,000 structural nodes
- **THEN** the service rejects it with the stable JSON-structure validation error

#### Scenario: Engine bounds remain independent
- **WHEN** a request is within wire limits but exceeds the layout engine's 5,000-node or 20,000-edge bound
- **THEN** strict engine DTO rebuilding rejects it without changing the wire limits

### Requirement: Compute responses are symmetrically bounded
The server and compute client SHALL enforce an 8 MiB complete response envelope
before writing and before parsing respectively.

#### Scenario: Server result envelope exceeds the response limit
- **WHEN** a successful worker result would serialize to a response larger than 8 MiB
- **THEN** the service returns HTTP 502 with `response_body_too_large` instead of the result

#### Scenario: Client receives an oversized response stream
- **WHEN** a compute response crosses 8 MiB before JSON parsing
- **THEN** the client aborts reading and reports `response_body_too_large`

### Requirement: Body collection is abort-aware
The service SHALL stop body collection and prevent dispatch when the client
disconnects before a complete request has been validated.

#### Scenario: Client disconnects during body upload
- **WHEN** the request closes before body collection completes
- **THEN** the service releases buffered state and does not enqueue compute work

### Requirement: Wire and engine capacity are separate contracts
Documentation and validation SHALL state that 8 MiB is the guaranteed compute
wire envelope and does not guarantee every theoretical maximum-string DTO
allowed by engine count bounds.

#### Scenario: Engine-valid request exceeds the wire envelope
- **WHEN** an otherwise engine-valid request exceeds 8 MiB
- **THEN** it fails without truncation, compression, persistence, or in-process fallback
