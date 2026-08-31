## ADDED Requirements

### Requirement: Native runtime modules SHALL have exclusive authorities

The native runtime SHALL separate worker framing, worker-pool scheduling, transfer staging, capability dispatch, and service composition so each authority has one owner.

#### Scenario: Module dependencies are inspected
- **WHEN** static governance scans native runtime imports and symbols
- **THEN** transfer code SHALL NOT import or call graph kernels
- **AND** worker code SHALL NOT access repository, canonical, Host, production roots, or service capability handlers

#### Scenario: Service composition is inspected
- **WHEN** the native service module is reviewed
- **THEN** it SHALL compose owners, run the listener, validate leases, and isolate cleanup failures
- **AND** it SHALL NOT implement worker frame parsing or transfer page semantics

### Requirement: Worker operations SHALL form a closed typed set

The worker pool SHALL accept a `WorkerOperation` closed set and SHALL expose distinct typed direct and paged execution paths without a string handler registry or general workflow state machine.

#### Scenario: Unknown wire operation arrives
- **WHEN** worker mode receives an operation outside the closed set
- **THEN** it SHALL return `invalid_request` without loading code or opening authority

#### Scenario: Transfer requests execution
- **WHEN** a sealed graph transfer is admitted
- **THEN** it SHALL invoke the paged pool path through `PagedInputSource` and `PagedOutputSink`
- **AND** it SHALL NOT assemble a monolithic graph request in the service process

### Requirement: Paged frames SHALL use acknowledged bounded flow control

The paged execution path SHALL retain at most one unacknowledged input frame and one unacknowledged output frame and SHALL validate exact task, section, index, byte length, node count, and hash identity.

#### Scenario: Input page is sent
- **WHEN** the pool sends a canonical input page
- **THEN** it SHALL wait for the exact worker acknowledgement before reading or sending the next page

#### Scenario: Output page is received
- **WHEN** the pool receives an output page
- **THEN** it SHALL acknowledge only after the sink validates and atomically stages the page

### Requirement: Transfer publication SHALL be attempt-atomic

The transfer owner SHALL expose output only after every expected terminal frame and a complete validated manifest have been staged and committed for the active attempt.

#### Scenario: Attempt fails after output pages
- **WHEN** crash, timeout, invalid frame, cancellation, or sink failure terminates an attempt
- **THEN** all output for that attempt SHALL be deleted
- **AND** sealed input SHALL remain available for explicit retry unless the session was canceled

#### Scenario: Terminal frame commits output
- **WHEN** all pages and the terminal frame match the active attempt
- **THEN** the owner SHALL atomically publish the output manifest and pages before reporting `completed`

### Requirement: Transfer state SHALL be disk-backed and disposable

Transfer canonical bytes SHALL live only beneath an isolated profile runtime transfer root while process memory retains descriptor and path metadata.

#### Scenario: Service starts after an earlier process
- **WHEN** the native runtime acquires profile ownership
- **THEN** it SHALL remove the previous transfer root before accepting sessions
- **AND** no session SHALL be recovered

#### Scenario: Session is canceled
- **WHEN** a client explicitly cancels a session
- **THEN** its input, attempts, output, descriptors, and idempotency reservation SHALL be removed
