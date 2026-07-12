## ADDED Requirements

### Requirement: POSIX process-group signals SHALL require current exclusive ownership proof
Runtime process cleanup SHALL authorize each negative-PID signal only from a current launch-token, subprocess PID, live PGID, and live SID proof bound to the same isolated controller launch.

#### Scenario: Full identity authorizes group TERM
- **GIVEN** the isolated launch strategy, pidfile token, pidfile PID, subprocess PID, launch PGID, launch SID, live PID, live PGID, and live SID all agree
- **AND** live PGID equals the target PID and live SID identifies the launch's independent session
- **WHEN** graceful close expires
- **THEN** runtime MAY send TERM to the validated process group.

#### Scenario: PGID mismatch rejects group signal
- **WHEN** token and PID agree but live PGID differs from the target PID or launch PGID
- **THEN** runtime SHALL NOT send a negative-PID signal
- **AND** it SHALL use direct subprocess fallback.

#### Scenario: SID mismatch rejects group signal
- **WHEN** token, PID, and PGID agree but live SID differs from the launch SID or does not prove an independent session
- **THEN** runtime SHALL NOT send a negative-PID signal
- **AND** it SHALL report possible remaining wrapper descendants.

#### Scenario: Identity query failure rejects group signal
- **WHEN** live process identity is unavailable, missing, malformed, or cannot be queried
- **THEN** runtime SHALL fail closed to direct subprocess cleanup
- **AND** ordinary ACP startup SHALL remain available.

### Requirement: Process-group escalation SHALL be revalidated
Runtime SHALL obtain a fresh exclusive-ownership proof before each process-group escalation signal and SHALL NOT treat a previous proof as continuing authorization.

#### Scenario: Identity changes after TERM
- **GIVEN** group TERM was authorized and sent
- **WHEN** PID, PGID, SID, token evidence, or process existence changes before KILL
- **THEN** runtime SHALL NOT send group KILL
- **AND** it SHALL use only direct subprocess fallback that remains scoped to the current handle.

#### Scenario: TERM delivery fails
- **WHEN** an authorized group TERM cannot be delivered
- **THEN** runtime SHALL NOT blindly send group KILL
- **AND** it SHALL enter direct subprocess fallback.

### Requirement: Process cleanup lifecycle SHALL be structured and non-sensitive
Runtime SHALL expose normalized ownership and teardown outcomes without exposing secrets or protocol contents.

#### Scenario: Safe fallback is audited
- **WHEN** group ownership cannot be proven
- **THEN** lifecycle data SHALL identify the structured rejection reason, direct fallback use, and possible wrapper descendants
- **AND** it SHALL NOT include the launch token value, environment values, credentials, complete sensitive command lines, or ACP payload bodies.

#### Scenario: Platforms report consistent ownership semantics
- **WHEN** Mozilla POSIX, Node POSIX, or Windows bridge transport closes
- **THEN** lifecycle data SHALL distinguish verified group ownership, direct child ownership, and rejected or unavailable group ownership using the same normalized fields.

