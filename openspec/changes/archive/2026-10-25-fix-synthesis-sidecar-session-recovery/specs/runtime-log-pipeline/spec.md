## MODIFIED Requirements

### Requirement: Runtime Log SHALL contain business semantics only

Synthesis business Runtime Log details SHALL contain operation, trigger, stage, outcome, duration, Host classification, and public semantic status only. Supervisor lifecycle incidents SHALL additionally retain a bounded normalized health-control failure code alongside the lifecycle reason; raw transport details, credentials, paths, and exception text SHALL remain excluded.

#### Scenario: RPC transport fails
- **WHEN** a Synthesis call fails after crossing HTTP and a worker boundary
- **THEN** one Host-normalized business incident is stored
- **AND** HTTP status, sizes, request IDs, worker codes, and trace data are absent

#### Scenario: Health failure initiates replacement
- **WHEN** a health-control failure causes the supervisor to retire its session
- **THEN** the lifecycle incident retains the normalized control cause
- **AND** business-operation entries remain transport-free
