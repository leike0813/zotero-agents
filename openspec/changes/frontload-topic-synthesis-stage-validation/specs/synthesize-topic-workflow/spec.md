## ADDED Requirements

### Requirement: Topic synthesis workflow rejects invalid content before final apply

The create/update topic synthesis workflow SHALL reject shallow semantic
content through package-local stage validation before final workflow apply.

#### Scenario: Stage-authored content is invalid

- **WHEN** a stage payload violates the topic synthesis content contract
- **THEN** the skill runtime SHALL reject that stage payload
- **AND** workflow apply SHALL NOT receive a successful final bundle.

#### Scenario: Valid stage-authored content completes

- **WHEN** Stage 7, Stage 8, Stage 9, and Stage 10 validations all pass
- **THEN** the workflow apply hook SHALL receive a normal topic synthesis
  result bundle.
