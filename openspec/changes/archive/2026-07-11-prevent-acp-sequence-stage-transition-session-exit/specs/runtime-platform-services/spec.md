## ADDED Requirements

### Requirement: Negative-PID cleanup SHALL target only a launch-bound process group

Runtime process cleanup SHALL send a negative-PID signal only when the target identity is bound to the current plugin-owned transport launch.

#### Scenario: Supervisor identity authorizes group cleanup
- **GIVEN** a POSIX wrapper-prone ACP transport was launched through the current `setsid` supervisor
- **AND** its pidfile token and PID match the current transport token and subprocess PID
- **WHEN** bounded graceful close expires
- **THEN** runtime MAY send TERM and then KILL to that validated process group.

#### Scenario: Mismatched PID rejects group cleanup
- **WHEN** the supervisor pidfile PID is invalid, missing, or different from the current subprocess PID
- **THEN** runtime SHALL NOT send a negative-PID signal
- **AND** it SHALL fall back to direct subprocess cleanup with a structured rejection diagnostic.

#### Scenario: Mismatched token rejects group cleanup
- **WHEN** the supervisor pidfile token does not match the current transport token
- **THEN** runtime SHALL NOT send a negative-PID signal
- **AND** it SHALL remove the pidfile after bounded direct cleanup.

#### Scenario: Failed TERM does not escalate an unconfirmed group operation
- **GIVEN** a process group passed identity validation
- **WHEN** the TERM group signal cannot be sent successfully
- **THEN** runtime SHALL use direct subprocess cleanup
- **AND** it SHALL NOT blindly issue a group KILL.
