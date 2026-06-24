# workflow-loader-contract-hardening Specification Delta

## MODIFIED Requirements

### Requirement: Loader outputs SHALL be deterministic for diagnostics and tests

Warnings/errors, loaded entries, and startup-adjacent workflow diagnostics MUST
be emitted in deterministic order and include enough context to distinguish
loader failures from official content subscription failures.

#### Scenario: Debug probe reports workflow source counts

- **WHEN** a workflow debug probe runs after startup
- **THEN** it SHALL report official workflow count, dev-local workflow count,
  and user workflow count
- **AND** it SHALL include latest official content install status when
  available.

#### Scenario: Empty workflow list preserves cause

- **WHEN** no workflows are loaded because official content has not been
  installed
- **THEN** diagnostics SHALL expose the empty official root and current
  subscription install state
- **AND** startup SHALL not require packaged content fallback.

#### Scenario: SkillRunner workflow dependencies are enforced

- **WHEN** a workflow declares `request.create.skill_id` or
  `request.sequence.steps[].skill_id`
- **AND** any declared skill is absent from the effective plugin skill registry
  or invalid
- **THEN** that workflow SHALL not enter the effective workflow registry
- **AND** diagnostics SHALL identify the missing skill dependency.
