## ADDED Requirements

### Requirement: Runtime maps skill-level mode to provider execution mode

The workflow runtime SHALL derive SkillRunner execution mode from skill-level
request fields and map it to provider `runtime_options.execution_mode`.

#### Scenario: Single job mode is normalized

- **GIVEN** a SkillRunner job request with `mode = interactive`
- **WHEN** the runtime finalizes the request
- **THEN** the provider request SHALL include `runtime_options.execution_mode = interactive`
- **AND** the top-level `mode` helper field SHALL NOT be sent as provider wire data.

#### Scenario: Sequence steps use independent modes

- **GIVEN** a sequence request whose first step has `mode = interactive`
- **AND** the second step has `mode = auto`
- **WHEN** the runtime launches each step
- **THEN** the first concrete step request SHALL use `runtime_options.execution_mode = interactive`
- **AND** the second concrete step request SHALL use `runtime_options.execution_mode = auto`.
