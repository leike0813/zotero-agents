# Sidecar operation observability

## MODIFIED Requirements

### Requirement: Host SHALL own business operation audit

The Host SHALL record mutation starts and invocation terminals, and failures of
reads and periodic calls, according to the production manifest. Each invocation
SHALL produce at most one failure incident regardless of nested faults. The
invocation classifies the initial receipt. The durable terminal classifies the
domain outcome.

#### Scenario: Mutation fails in a worker
- **WHEN** a mutation starts and a nested worker failure reaches the Host
- **THEN** Runtime Log contains its start and one failed terminal incident
- **AND** no transport or worker failure is persisted separately

#### Scenario: Inline status-bearing operation is not successful
- **WHEN** transport succeeds for an inline operation but a declared semantic status is not accepted
- **THEN** the mutation invocation terminal is failed with the public semantic status

#### Scenario: Long mutation is accepted
- **WHEN** a public-maintenance-operation command returns `pending` or `running`
- **THEN** the Host invocation terminal and root trace are successful with that lifecycle status
- **AND** no `semantic_non_success` incident is created before the durable operation reaches a terminal

#### Scenario: Initial maintenance receipt classifies admission

- **WHEN** a manifest operation returns a public maintenance envelope
- **THEN** `pending`, `running`, and `completed` SHALL classify the invocation as accepted
- **AND** failed, canceled, timed-out, missing, malformed, or unknown lifecycle states SHALL classify it as unsuccessful

#### Scenario: Accepted work reaches a business terminal
- **WHEN** an accepted public maintenance operation later completes or fails
- **THEN** its operation query and terminal receipt remain authoritative for the business outcome
- **AND** statuses inside that terminal receipt are not reinterpreted as the initial invocation result

#### Scenario: Accepted work outlives its command RPC
- **WHEN** a public maintenance command returns before its accepted work reaches a terminal
- **THEN** the originating trace remains active and retains accepted, running, and exactly one terminal lifecycle event carrying the public operation ID and capability
- **AND** polling traces cannot evict the originating trace before that terminal

#### Scenario: Worker-backed maintenance fails
- **WHEN** an accepted maintenance worker times out, crashes, or returns an unsuccessful domain status
- **THEN** the durable terminal and terminal trace preserve the first stable raw failure code
- **AND** Workbench reports that code together with the public operation ID

#### Scenario: Accepted retrieval index maintenance fails or times out

- **WHEN** the durable transition winner commits a failed or timed-out terminal for a retrieval build, rebuild, update, or cleanup
- **THEN** the Host supervisor SHALL write one Runtime Log error with the capability, public operation ID, status, and stable failure code regardless of the debug gate or Workbench lifetime
- **AND** that durable terminal SHALL keep a single log through receipt polling and replay

#### Scenario: Library retrieval execution throws

- **WHEN** the private Library retrieval RPC exits with a validation, readiness, transport, or result error
- **THEN** the Host SHALL write one sanitized read failure entry
- **AND** a successful result carrying lexical fallback information SHALL retain the successful read policy
