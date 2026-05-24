## REMOVED Requirements

### Requirement: Workflows declare supported backend types

Workflow implementations SHALL support `execution.supportedBackends` as an
optional backend type declaration. Backend listing and resolution SHALL only
return compatible backend types when the declaration is present.

#### Scenario: ACP-only workflow excludes SkillRunner

- **GIVEN** a workflow declares `execution.supportedBackends: ["acp"]`
- **WHEN** backends are listed or resolved for the workflow
- **THEN** SkillRunner backends SHALL NOT be considered compatible
- **AND** selecting a SkillRunner backend SHALL fail with an incompatible
  backend error.

## ADDED Requirements

### Requirement: Workflow provider determines compatible backend types

Workflow execution MUST derive compatible backend profile types from top-level
`provider` only. `request.kind` MUST describe request protocol/shape and MUST
NOT infer backend compatibility.

#### Scenario: ACP provider excludes SkillRunner backend

- **GIVEN** a workflow declares `provider: "acp"`
- **AND** the workflow request kind is `skillrunner.job.v1`
- **WHEN** backend profiles are listed or resolved for the workflow
- **THEN** only ACP backend profiles SHALL be considered compatible
- **AND** SkillRunner backend profiles SHALL NOT be listed or selected.

#### Scenario: SkillRunner provider permits ACP bridge

- **GIVEN** a workflow declares `provider: "skillrunner"`
- **WHEN** backend profiles are listed or resolved for the workflow
- **THEN** SkillRunner backend profiles SHALL be compatible
- **AND** ACP backend profiles SHALL also be compatible as the local
  SkillRunner-compatible ACP bridge.

#### Scenario: Other providers match backend type directly

- **GIVEN** a workflow declares any provider other than `acp` or `skillrunner`
- **WHEN** backend profiles are listed or resolved for the workflow
- **THEN** only backend profiles whose type equals the provider SHALL be
  compatible.

#### Scenario: Request kind is not a backend compatibility source

- **GIVEN** two workflows with the same `request.kind`
- **AND** the workflows declare different providers
- **WHEN** compatible backend profiles are resolved
- **THEN** backend compatibility SHALL follow each workflow's provider
- **AND** SHALL NOT be inferred from the shared request kind.

#### Scenario: Missing provider is invalid for execution

- **GIVEN** a workflow manifest has no top-level provider
- **WHEN** backend profiles are listed or resolved for execution
- **THEN** the runtime SHALL report a deterministic missing-provider error
- **AND** it SHALL NOT infer a backend type from `request.kind`.
