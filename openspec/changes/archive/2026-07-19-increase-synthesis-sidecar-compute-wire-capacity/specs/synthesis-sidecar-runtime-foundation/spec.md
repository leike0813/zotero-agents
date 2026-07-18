## ADDED Requirements

### Requirement: Shared call endpoint preserves capability-specific limits
The authenticated call endpoint SHALL use an 8 MiB absolute collection bound
and SHALL apply the stricter 1 MiB bound after identifying a general or system
capability.

#### Scenario: Shared endpoint receives a medium system envelope
- **WHEN** a valid system request is larger than 1 MiB and no larger than 8 MiB
- **THEN** authentication and parsing do not allow it to bypass the system request limit

### Requirement: Oversized response has a stable transport code
Sidecar contracts SHALL expose `response_body_too_large` as a stable error code
without changing health, handshake, shutdown, or capability discovery DTOs.

#### Scenario: Caller handles an oversized response
- **WHEN** the service or client enforces the response cap
- **THEN** the caller can identify `response_body_too_large` without matching error text
