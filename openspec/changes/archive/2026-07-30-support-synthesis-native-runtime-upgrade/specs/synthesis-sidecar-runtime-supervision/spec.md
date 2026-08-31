## ADDED Requirements

### Requirement: Supervision SHALL pin one admitted runtime generation

The production supervisor SHALL launch an explicitly resolved verified runtime
and expected admission generation. Discovery, health, and handshake MUST match
that generation before the service can become ready.

#### Scenario: Mutable active pointer changes during launch
- **WHEN** the installed active pointer advances after a generation is selected
- **THEN** the in-flight supervisor continues using its pinned executable and identity

#### Scenario: Service reports another generation
- **WHEN** discovery, health, or handshake does not match the expected admission generation
- **THEN** the supervisor stops the service and reports runtime mismatch
