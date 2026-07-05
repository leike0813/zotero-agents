## MODIFIED Requirements

### Requirement: ACP runner SHALL recognize Kilo as a project-skill-root agent family

ACP agent family resolution SHALL treat Kilo as a known project-skill-root family. Kilo's default project skill root SHALL be `.kilo/skills`.

#### Scenario: Kilo backend resolves to Kilo family

- **GIVEN** an ACP backend is explicitly configured as `kilo` or is inferred from Kilo command metadata
- **WHEN** ACP agent family resolution runs
- **THEN** the resolved family SHALL be `kilo`
- **AND** the default skill roots SHALL include `.kilo/skills`.

#### Scenario: Kilo preset uses Kilo family

- **WHEN** the Kilo ACP preset is converted into a backend profile
- **THEN** the backend profile SHALL set `acp.agentFamily` to `kilo`.
