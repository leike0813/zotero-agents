## ADDED Requirements

### Requirement: Host Bridge SHALL expose SkillRunner connection audit as a debug capability

Host Bridge debug capabilities SHALL include a read-only SkillRunner connection
audit snapshot.

#### Scenario: debug capability returns connection snapshot

- **WHEN** debug mode is enabled
- **AND** a caller invokes `debug.skillrunner.connections.snapshot`
- **THEN** the capability SHALL return the redacted SkillRunner connection
  governor snapshot used by the Dashboard audit tab

#### Scenario: debug capability is gated

- **WHEN** debug mode is disabled
- **THEN** `debug.skillrunner.connections.snapshot` SHALL NOT be exposed or
  callable outside the existing debug capability gating
