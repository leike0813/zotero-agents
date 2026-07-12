## ADDED Requirements

### Requirement: Local ACP engines and sessions SHALL use the shared transport controller
Every local ACP engine or session launch SHALL be created and closed through the shared ACP transport controller, including adapter and direct diagnostic launches.

#### Scenario: Adapter launch is controlled
- **WHEN** a local ACP adapter initializes an engine or session
- **THEN** its transport SHALL be owned by the shared controller
- **AND** adapter close SHALL delegate teardown to that controller.

#### Scenario: Raw diagnostic launch is controlled
- **WHEN** a diagnostic launches an ACP transport without an adapter
- **THEN** it SHALL receive the same controlled transport boundary
- **AND** it SHALL NOT access an unverified process-group termination primitive.

#### Scenario: Close is idempotent
- **WHEN** two callers close the same controller concurrently or repeatedly
- **THEN** they SHALL reuse one teardown operation
- **AND** stdin EOF and process termination SHALL execute at most once.

### Requirement: Shared ACP controller close SHALL be bounded and EOF-first
The shared controller SHALL stop new writes, settle queued writes, request bounded stdin EOF, and allow bounded graceful exit before attempting process termination.

#### Scenario: Backend exits after EOF
- **WHEN** the backend exits within the grace period after stdin EOF
- **THEN** the controller SHALL finish close without group or direct kill.

#### Scenario: EOF or write drain stalls
- **WHEN** queued writes or stdin close exceed their deadline
- **THEN** controller close SHALL continue to the same fail-closed cleanup decision
- **AND** close SHALL NOT remain pending indefinitely.

