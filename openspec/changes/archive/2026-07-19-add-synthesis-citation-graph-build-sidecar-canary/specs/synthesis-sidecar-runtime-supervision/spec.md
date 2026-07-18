## ADDED Requirements

### Requirement: Supervision SHALL cancel graph-build canary work
Supervision SHALL stop accepting graph-build work on client disconnect,
authenticated shutdown, host lease expiry, stdin EOF, or supervisor stop and use the existing
bounded pool cancellation and termination path.

#### Scenario: Client disconnects during graph build
- **WHEN** the HTTP client disconnects while graph build is queued or active
- **THEN** the task SHALL be canceled and no late result SHALL be returned

#### Scenario: Supervisor stops during graph build
- **WHEN** the supervisor stops a service with active graph-build work
- **THEN** the Node process and its worker thread SHALL terminate without an orphan descendant
