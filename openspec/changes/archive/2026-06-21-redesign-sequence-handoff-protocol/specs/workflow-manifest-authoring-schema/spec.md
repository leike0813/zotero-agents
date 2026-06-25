## MODIFIED Requirements

### Requirement: Workflow manifest schema SHALL validate sequence handoff

Workflow manifests SHALL accept only the typed sequence handoff binding shape.

#### Scenario: Legacy handoff shape is rejected

- **WHEN** a sequence step declares legacy `handoff.input`, `handoff.parameter`, `handoff.pass_through`, `handoff.defaults`, or `handoff.from_step`
- **THEN** the manifest SHALL fail schema validation.

#### Scenario: Typed handoff shape is accepted

- **WHEN** a sequence step declares `handoff.bindings[]` with `kind`, `target`, and either source or constant value semantics
- **THEN** the manifest SHALL pass schema validation.
