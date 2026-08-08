## MODIFIED Requirements

### Requirement: Host SHALL own business operation audit

The Host SHALL emit mutation start and invocation-terminal records and read/periodic failure records from the production operation manifest. One invocation SHALL own at most one failure incident regardless of nested boundary failures. For a manifest operation whose receipt is `public-maintenance-operation`, the invocation terminal SHALL classify the public maintenance lifecycle envelope: `pending`, `running`, and `completed` are accepted, while failed, canceled, timed-out, missing, malformed, or unknown lifecycle states are non-success. Domain promotion and failure statuses belong to the durable operation terminal and MUST NOT be applied to the initial receipt envelope.

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

#### Scenario: Worker process panics
- **WHEN** a Rust worker terminates with identifiable panic evidence before returning a terminal frame
- **THEN** the parent reports the stable `worker_panicked` code and replaces the failed worker
- **AND** captured panic text remains bounded and internal rather than entering a public receipt, trace, Runtime Log, or Workbench diagnostic
