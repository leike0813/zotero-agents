## MODIFIED Requirements

### Requirement: Literature Digest SHALL Auto Run Reference Matching After Apply

The `literature-digest` workflow MUST provide a default-enabled
`auto_reference_matching` workflow runtime option and, when enabled, SHALL run
reference matching on the references note produced by the digest apply step.
The option MUST NOT be dispatched to the skill/agent as a provider-facing
parameter.

#### Scenario: Auto matching is enabled by default

- **WHEN** builtin workflows are loaded
- **THEN** `literature-digest` SHALL expose `auto_reference_matching`
- **AND** its default value SHALL be `true`
- **AND** it SHALL be declared as runtime-only.

#### Scenario: Digest skill request does not receive auto matching option

- **WHEN** a `literature-digest` provider request is compiled
- **THEN** the request `parameter` payload SHALL include skill-facing parameters such as `language`
- **AND** it SHALL NOT include `auto_reference_matching`.

#### Scenario: Digest apply uses runtime-only auto matching option

- **WHEN** `literature-digest` successfully writes its generated notes
- **AND** local result context has `auto_reference_matching` not equal to `false`
- **THEN** the workflow SHALL run reference matching on the produced references note
- **AND** it SHALL write the reference matching baseline into that references payload.

#### Scenario: Digest apply can disable auto matching locally

- **WHEN** `literature-digest` is applied with runtime-only `auto_reference_matching=false`
- **THEN** it SHALL write the digest generated notes
- **AND** it SHALL NOT run the auto reference matching post-process.
