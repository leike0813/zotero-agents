## ADDED Requirements

### Requirement: Host Bridge SHALL derive locality from trusted transport context
Host Bridge SHALL derive effective local or remote mode from the accepted socket peer and listener, not from a client-controlled header.

#### Scenario: Remote peer declares local
- **WHEN** a non-loopback or unknown peer declares local connection mode
- **THEN** Host Bridge SHALL treat the request as remote.

#### Scenario: Local peer requests remote behavior
- **WHEN** a loopback peer explicitly declares remote mode
- **THEN** Host Bridge SHALL use the more restrictive remote behavior.

#### Scenario: Trusted peer information is unavailable
- **WHEN** peer locality cannot be established
- **THEN** Host Bridge SHALL fail closed to remote delivery semantics.
