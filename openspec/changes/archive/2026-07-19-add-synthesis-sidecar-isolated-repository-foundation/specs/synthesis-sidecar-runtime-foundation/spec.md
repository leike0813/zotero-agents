## ADDED Requirements

### Requirement: Control contracts report isolated repository readiness
The strict health and handshake contracts SHALL include the same repository snapshot with mode, state, fixed foundation schema version, and opaque repository ID while retaining `mutationEnabled: false` and the existing public capability set.

#### Scenario: Health and handshake preserve parity
- **WHEN** the service is ready and an authenticated control client rebuilds health and handshake responses
- **THEN** repository snapshots are equal and public capabilities and mutation authority are unchanged
