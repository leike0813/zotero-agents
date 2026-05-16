## ADDED Requirements

### Requirement: Literature Digest SHALL Auto Run Reference Matching After Apply

The `literature-digest` workflow MUST provide a default-enabled
`auto_reference_matching` option and, when enabled, SHALL run reference matching
on the references note produced by the digest apply step.

#### Scenario: Auto matching is enabled by default

- **WHEN** builtin workflows are loaded
- **THEN** `literature-digest` SHALL expose `auto_reference_matching`
- **AND** its default value SHALL be `true`.

#### Scenario: Digest apply runs matching on the produced references note

- **WHEN** `literature-digest` successfully writes its generated notes
- **AND** `auto_reference_matching` is not `false`
- **THEN** the workflow SHALL run reference matching on the produced references note
- **AND** it SHALL write the reference matching baseline into that references payload.

#### Scenario: Digest apply can disable auto matching

- **WHEN** `literature-digest` is applied with `auto_reference_matching=false`
- **THEN** it SHALL write the digest generated notes
- **AND** it SHALL NOT run the auto reference matching post-process.

#### Scenario: Auto matching failure does not fail digest apply

- **WHEN** the digest generated notes are written successfully
- **AND** the auto reference matching post-process fails
- **THEN** the digest apply result SHALL still be successful
- **AND** it SHALL include a warning for the auto matching failure.
