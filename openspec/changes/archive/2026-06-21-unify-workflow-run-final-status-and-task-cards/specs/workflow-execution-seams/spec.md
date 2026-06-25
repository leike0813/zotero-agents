## ADDED Requirements

### Requirement: Workflow apply outcome SHALL contribute to main run status

Workflow execution seams SHALL treat a run as user-visible succeeded only when backend execution succeeded and required apply succeeded, was skipped, or was not required.

#### Scenario: Apply failure after backend success

- **WHEN** an ACP Skills or SkillRunner run reaches backend `succeeded`
- **AND** required `applyResult` fails
- **THEN** the run's main status SHALL be `failed`
- **AND** the run's backend status SHALL remain `succeeded`
- **AND** summaries and task projections SHALL expose the apply failure.

#### Scenario: Apply skipped is successful

- **WHEN** backend execution succeeds
- **AND** apply is skipped or not required
- **THEN** the run's main status SHALL be `succeeded`.
