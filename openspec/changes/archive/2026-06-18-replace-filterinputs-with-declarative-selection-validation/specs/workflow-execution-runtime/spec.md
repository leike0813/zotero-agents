## ADDED Requirements

### Requirement: Workflow selection validation is declarative

Workflow input filtering SHALL be represented by manifest `validateSelection`
and evaluated before request construction.

#### Scenario: Request build is not used for availability

- **WHEN** a workflow menu or diagnostic probe checks whether a workflow can run
- **THEN** it SHALL evaluate `validateSelection`
- **AND** it SHALL NOT call `buildRequest` or any workflow hook.

#### Scenario: filterInputs is rejected

- **WHEN** a workflow manifest declares `hooks.filterInputs`
- **THEN** the loader SHALL reject the manifest as invalid.

#### Scenario: execution consumes scoped selection contexts

- **WHEN** execution starts
- **THEN** the runtime SHALL evaluate `validateSelection` in execute mode
- **AND** build one request per returned scoped selection context
- **AND** raise `NO_VALID_INPUT_UNITS` when no valid context remains.
