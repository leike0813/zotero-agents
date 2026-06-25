## ADDED Requirements

### Requirement: Provider adapter receives backend execution mode unchanged

Provider adapters SHALL continue using backend `runtime_options.execution_mode`
after workflow runtime normalization.

#### Scenario: Skill-level mode reaches SkillRunner backend wire shape

- **GIVEN** a workflow declares skill-level `mode`
- **WHEN** the provider adapter dispatches the request
- **THEN** the backend payload SHALL carry the same value in
  `runtime_options.execution_mode`
- **AND** no workflow-level mode field SHALL be required by the adapter.
