## MODIFIED Requirements

### Requirement: A concurrency slot SHALL cover the complete workflow execution unit

An admitted execution unit and its submission slot MUST have independent lifecycles. A slot MUST remain occupied while provider work or Host-owned result application is actively proceeding. `waiting_user`, `waiting_auth`, and recoverable failure states MUST yield the slot without settling the unit. Success, terminal failure, confirmed cancellation, and hard timeout MUST release at most one held slot and settle the unit exactly once.

#### Scenario: Successful unit finishes result application

- **WHEN** an admitted unit's provider run succeeds
- **THEN** the Host SHALL reacquire a slot if the unit previously yielded
- **AND** it SHALL keep that slot through terminal result application
- **AND** it SHALL release exactly one held slot after apply settles

#### Scenario: Sequence pauses for user interaction

- **WHEN** an admitted sequence unit enters `waiting_user`, `waiting_auth`, or a recoverable failure
- **THEN** the unit SHALL remain non-terminal
- **AND** it SHALL yield its submission slot exactly once
- **AND** the Host MAY admit the next initial unit from that submission

#### Scenario: Unit reaches a terminal outcome without a held slot

- **WHEN** a yielded unit reaches terminal failure, hard timeout, success, or confirmed cancellation before local resumption
- **THEN** the Host SHALL cancel any unsent resumption callback
- **AND** it SHALL settle the unit without decrementing the held-slot count below zero

## ADDED Requirements

### Requirement: Resumption admission SHALL precede initial work within one submission

The Host SHALL enqueue a yielded unit's reply, authorization, retry, autonomous local continuation, or apply as a resumption request. Resumptions MUST retain request order and MUST be admitted before not-yet-started units from the same submission. They MUST NOT compete with or consume slots from another submission.

#### Scenario: Waiting unit resumes behind current work

- **GIVEN** a one-slot submission ordered A, B, C
- **AND** A yields so B is admitted
- **WHEN** A requests resumption while B holds the slot
- **THEN** A SHALL remain resumption-pending until B releases the slot
- **AND** A SHALL be admitted before initial unit C

#### Scenario: Two submissions resume independently

- **WHEN** yielded units from two submissions request resumption
- **THEN** each request SHALL be ordered only against work in its own submission
- **AND** neither submission SHALL change the other's held-slot count

### Requirement: Submission display identity SHALL be safe and stable

Each process-local submission SHALL freeze a provider label, model label, and stable symbol when created. The symbol MUST use the ordered non-numeric celestial/natural alphabet `🌙`, `☀️`, `⭐`, `☄️`, `🪐`, `🌍`, `🌊`, `🔥`, extending with ordered multi-symbol codes after eight submissions. Display identity MUST NOT contain credentials or full provider options and MUST NOT be reused while the process is running.

#### Scenario: More than eight submissions coexist

- **WHEN** the ninth and later submissions are created
- **THEN** each SHALL receive a unique stable multi-symbol code
- **AND** no code SHALL contain a digit or numeric emoji

#### Scenario: Model configuration is absent

- **WHEN** provider or model display input is blank
- **THEN** the frozen display identity SHALL expose an explicit localized default fallback
- **AND** it SHALL not copy arbitrary provider options
