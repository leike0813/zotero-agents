## ADDED Requirements

### Requirement: Topic synthesis skills describe staged validation ownership

Create and update topic synthesis skill instructions SHALL explain that each
semantic stage validates the content it first authors.

#### Scenario: Agent reads the minimal path

- **WHEN** an agent reads create/update `SKILL.md`
- **THEN** Stage 7 SHALL be described as the write-and-validate stage for
  taxonomy/timeline
- **AND** Stage 8 SHALL be described as the write-and-validate stage for core
  analytical sections
- **AND** Stage 9 SHALL be described as payload-first final section
  prevalidation and materialization
- **AND** Stage 10 SHALL be described as final bundle/parity validation.

### Requirement: Gate repair guidance points to the failing authoring stage

Gate JIT instructions SHALL direct agents to repair the current authoring stage
when stage validation fails.

#### Scenario: Stage validation fails

- **WHEN** the runtime records a retryable failure for Stage 7, 8, or 9
- **THEN** the next gate response SHALL keep the run at the failed stage
- **AND** it SHALL name the stage payload to repair.
