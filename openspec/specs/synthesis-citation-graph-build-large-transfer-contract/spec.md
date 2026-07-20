# synthesis-citation-graph-build-large-transfer-contract Specification

## Purpose
Defines the Synthesis citation graph build large transfer contract, specifying the data exchange format, validation rules, and integration boundaries.

## Requirements

### Requirement: Sealed transfer sessions expose asynchronous execution

The transfer action union SHALL include strict `execute { sessionId }` admission, and transfer status SHALL expose queued, executing, publication, completed, and retryable failed-attempt state without binding task lifetime to the HTTP connection.

#### Scenario: Execute is admitted
- **WHEN** an authenticated client executes an `input_sealed` session with queue capacity
- **THEN** the service SHALL return its queued status immediately and run the attempt independently of client disconnect

#### Scenario: Failed attempt is retried explicitly
- **WHEN** an admitted attempt fails
- **THEN** status SHALL return to `input_sealed`, include a stable structured last failure, preserve input pages, and permit a later explicit `execute`

#### Scenario: Execute is idempotent while active or complete
- **WHEN** `execute` is repeated for a queued, executing, publishing, or completed session
- **THEN** the service SHALL return the current status without creating another attempt

### Requirement: Citation Graph Build transfer SHALL use strict versioned manifests

The system SHALL define `synthesis-citation-graph-build-transfer.v1` input and output manifests using `canonical_json_rows.v1`, strict direction-specific headers, fixed page kinds, complete page descriptors, and deterministic SHA-256 identities.

#### Scenario: Input manifest is rebuilt
- **WHEN** a client begins a transfer with graph-build scope, role priority, and descriptors for `library_nodes` and `references`
- **THEN** the system rebuilds every field strictly and accepts only the declared version, encoding, kinds, ordering, counts, sizes, and hashes

#### Scenario: Output manifest is rebuilt
- **WHEN** the service publishes graph-build scope, diagnostics, and descriptors for the six result page kinds
- **THEN** the system rebuilds the output header and descriptors without recomputing the complete graph result

### Requirement: Transfer pages SHALL be bounded independently

The system SHALL limit each canonical page to 4 MiB and 100k JSON nodes, each direction to 256 pages and 1 GiB, each service to two active sessions, and aggregate staged storage to 2 GiB.

#### Scenario: Aggregate transfer exceeds monolithic wire limit
- **WHEN** a valid graph-build input larger than 8 MiB is split into individually valid pages
- **THEN** the service accepts the pages without increasing the existing monolithic compute request limit

#### Scenario: A transfer limit is exceeded
- **WHEN** a page, direction, session count, or aggregate staged-byte limit would be exceeded
- **THEN** the service rejects the action with `transfer_limit_exceeded` or retryable `transfer_busy` without retaining the rejected content

### Requirement: Transfer retries SHALL be deterministic and idempotent

The system SHALL identify begin requests by an idempotency key and pages by their declared descriptor and recomputed canonical hash.

#### Scenario: Begin is retried
- **WHEN** the same idempotency key and input manifest are submitted again
- **THEN** the service returns the existing session identity

#### Scenario: Page upload is retried
- **WHEN** an already accepted page is submitted with identical rebuilt rows and hash
- **THEN** the service reports success without increasing counters or rewriting semantic state

#### Scenario: Idempotent identity drifts
- **WHEN** a reused idempotency key or page identity carries different content
- **THEN** the service returns `transfer_conflict`

### Requirement: Input seal SHALL prove manifest completeness

The system SHALL permit input seal only after every declared page has been accepted and the recomputed ordered manifest root matches.

#### Scenario: Pages arrive out of order
- **WHEN** all declared pages are uploaded in arbitrary order and each matches its descriptor
- **THEN** seal succeeds using fixed kind and page-index ordering

#### Scenario: A page is missing or invalid
- **WHEN** seal is requested with a missing page, wrong count, wrong byte length, wrong page hash, or wrong root hash
- **THEN** the service returns `transfer_incomplete` or `transfer_conflict` and keeps the session unsealed

### Requirement: Output publication SHALL remain service internal

The system SHALL expose authenticated output manifest/page reads but SHALL NOT expose output mutation actions to external callers in this change.

#### Scenario: Output is not available
- **WHEN** a client requests output before the internal producer seals it
- **THEN** the service returns retryable `transfer_output_not_ready`

#### Scenario: Internal output is complete
- **WHEN** the service owner has validated, published, and sealed every declared output page
- **THEN** an authenticated client can read the strict manifest and individually bounded pages

### Requirement: Transfer sessions SHALL be ephemeral and bounded in time

The system SHALL expire a session after five idle minutes or thirty absolute minutes, reap at a bounded interval, and never recover staged sessions after service restart.

#### Scenario: Session expires
- **WHEN** either lifetime deadline elapses
- **THEN** the session becomes unaddressable, counters are released, and later calls return `transfer_not_found`

#### Scenario: Service restarts
- **WHEN** a service starts with transfer artifacts from an earlier process
- **THEN** it retires those artifacts without advertising or recovering a session

### Requirement: Transfer runtime boundaries SHALL use graph DTO SSOT

The system SHALL rebuild every input and output row with synthesis-engine-owned validators and SHALL use structural page validation rather than full-result semantic recomputation at transfer boundaries.

#### Scenario: Page rows are valid
- **WHEN** a small direct-engine request and result are split, transferred, and reassembled
- **THEN** they are semantically identical to the direct-engine oracle

#### Scenario: A row is invalid
- **WHEN** any input upload or internal output publication contains an invalid graph-build row
- **THEN** the action fails before durable staging of that page

### Requirement: Graph transfer SHALL reuse canonical staged bytes

The transfer owner SHALL feed already staged canonical input page bytes to `citation_graph_build_transfer.v1` and SHALL stage Rust raw-result artifacts directly as validated output pages without full graph materialization, aggregate base64 copies, or a second transfer owner.

#### Scenario: Normal graph transfer executes

- **WHEN** a sealed 2,000-source/100,000-reference input is admitted
- **THEN** the same canonical page bytes SHALL cross the Rust worker boundary
- **AND** publication SHALL preserve external manifest, page, hash, retry, and idempotency semantics.

### Requirement: Transfer publication SHALL be attempt-atomic

Only the existing transfer owner SHALL acknowledge output after strict validation and atomic staging; partial output from cancellation, timeout, crash, invalid framing, or sink failure SHALL remain invisible.

#### Scenario: Rust child fails after output pages

- **WHEN** an attempt terminates before a valid terminal frame and complete manifest
- **THEN** no output SHALL be readable
- **AND** sealed input SHALL remain available for explicit retry.
