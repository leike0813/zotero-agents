## ADDED Requirements

### Requirement: SkillRunner connection audit MUST be source-gated and debug-only

The plugin MUST collect and expose the SkillRunner connection audit only when its hard-coded source switch and debug mode are both enabled.

#### Scenario: Source switch is disabled in debug mode

- **WHEN** debug mode is enabled and the SkillRunner connection-audit source switch is disabled
- **THEN** Dashboard MUST NOT expose or accept the `skillrunner-connection-audit` surface
- **AND** SkillRunner connection operations MUST NOT record or summarize audit events

#### Scenario: Debug mode is disabled with source included

- **WHEN** the SkillRunner connection-audit source switch is enabled and debug mode is disabled
- **THEN** Dashboard MUST NOT expose or accept the connection-audit surface
- **AND** the production runtime bundle MUST eliminate connection-audit collection from governor hot paths

#### Scenario: Both audit gates are enabled

- **WHEN** the source switch and debug mode are both enabled
- **THEN** Dashboard MUST expose the existing read-only connection-audit surface
- **AND** its snapshot DTO, event retention, rendering, and copy behavior MUST remain unchanged
