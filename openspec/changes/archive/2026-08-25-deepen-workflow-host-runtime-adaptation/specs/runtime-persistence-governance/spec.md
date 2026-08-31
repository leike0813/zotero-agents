## ADDED Requirements

### Requirement: Runtime filesystem adapters support strict and tolerant interfaces

Plugin-owned runtime filesystem access SHALL use one runtime adapter selection
implementation while preserving distinct strict and tolerant caller semantics.

#### Scenario: Tolerant persistence read targets a missing file

- **WHEN** an existing tolerant persistence reader targets a missing path
- **THEN** it SHALL return its documented empty result
- **AND** the missing path SHALL NOT be reported as a successful strict read.

#### Scenario: Strict workflow read targets a missing file

- **WHEN** a strict workflow-facing reader targets a missing or invalid path
- **THEN** it SHALL reject deterministically
- **AND** it SHALL NOT reinterpret the result as empty file content.

#### Scenario: Strict workflow write has no runtime adapter

- **WHEN** no supported asynchronous runtime adapter can write a file or create
  its parent directory
- **THEN** the strict operation SHALL reject
- **AND** it SHALL NOT report a successful no-op.
