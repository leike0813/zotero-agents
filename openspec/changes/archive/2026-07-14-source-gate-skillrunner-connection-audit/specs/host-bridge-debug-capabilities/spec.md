## MODIFIED Requirements

### Requirement: Host Bridge SHALL expose SkillRunner connection audit as a debug capability

Host Bridge debug capabilities SHALL include the read-only SkillRunner connection audit snapshot only when the connection-audit source switch and debug mode are both enabled.

#### Scenario: debug capability returns connection snapshot

- **WHEN** the connection-audit source switch and debug mode are both enabled
- **AND** a caller invokes `debug.skillrunner.connections.snapshot`
- **THEN** the capability SHALL return the redacted SkillRunner connection governor snapshot used by the Dashboard audit tab

#### Scenario: debug capability is gated by debug mode

- **WHEN** debug mode is disabled
- **THEN** `debug.skillrunner.connections.snapshot` SHALL NOT be exposed or callable outside the existing debug capability gating

#### Scenario: debug capability is gated by source switch

- **WHEN** the connection-audit source switch is disabled
- **THEN** `debug.skillrunner.connections.snapshot` SHALL NOT be registered or reachable
- **AND** its handler and audit module imports SHALL be eliminated from the main runtime bundle
