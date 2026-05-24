## ADDED Requirements

### Requirement: Workflow settings SHALL list provider-compatible backend profiles

Workflow settings and submit gates MUST list backend profiles using the
provider-derived compatibility contract from `workflow-contract`.

#### Scenario: ACP provider settings list only ACP profiles

- **GIVEN** a workflow declares `provider: "acp"`
- **AND** the configured backends include ACP and SkillRunner profiles
- **WHEN** the workflow settings dialog or submit settings gate is opened
- **THEN** the profile selector SHALL include ACP profiles
- **AND** it SHALL NOT include SkillRunner profiles.

#### Scenario: SkillRunner provider settings list SkillRunner and ACP profiles

- **GIVEN** a workflow declares `provider: "skillrunner"`
- **AND** the configured backends include ACP and SkillRunner profiles
- **WHEN** the workflow settings dialog or submit settings gate is opened
- **THEN** both SkillRunner and ACP profiles SHALL be eligible.

#### Scenario: Persisted incompatible backend is rejected

- **GIVEN** persisted workflow settings contain a backend ID whose backend type
  is not compatible with the workflow provider
- **WHEN** execution context is resolved
- **THEN** the backend ID SHALL be rejected as incompatible
- **AND** the runtime SHALL NOT silently fall back based on `request.kind`.

#### Scenario: Dashboard quick-run uses provider compatibility

- **GIVEN** the Dashboard renders workflow quick-run controls
- **WHEN** it determines whether a workflow can run without showing settings
- **THEN** backend/profile availability SHALL be evaluated with
  provider-derived compatibility.
