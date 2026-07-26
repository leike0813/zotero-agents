## ADDED Requirements

### Requirement: Parameter-dependent artifact exclusions SHALL be execution-only

A declarative `artifact-exists` exclusion that names a workflow `parameter`
MUST NOT participate in menu or diagnostic availability filtering. It MUST be
evaluated during execute-mode selection validation using the user's confirmed
workflow parameters.

#### Scenario: Persisted parameter target already exists

- **WHEN** an artifact exists for the persisted or default value of a parameter-dependent exclusion
- **AND** menu or diagnostic availability is evaluated
- **THEN** the exclusion SHALL NOT disable the workflow or remove the source unit

#### Scenario: Confirmed parameter target already exists

- **WHEN** execute-mode validation resolves an existing artifact from the confirmed parameter value
- **THEN** the matching source unit SHALL be counted as skipped
- **AND** request construction and provider submission SHALL NOT occur for that unit

#### Scenario: Artifact exists for a different parameter value

- **WHEN** an artifact exists for parameter value A
- **AND** execute-mode validation is confirmed with parameter value B whose target artifact does not exist
- **THEN** the source unit SHALL remain executable

#### Scenario: Mixed execution batch contains matching and non-matching units

- **WHEN** a confirmed parameter-dependent exclusion matches only some selected source units
- **THEN** matching units SHALL be counted as skipped
- **AND** non-matching units SHALL continue to request construction

#### Scenario: Every execution unit is skipped

- **WHEN** a confirmed parameter-dependent exclusion matches every selected source unit
- **THEN** execute-mode validation SHALL produce zero valid units with the existing no-valid-input outcome
- **AND** its statistics SHALL preserve the skipped-unit count

### Requirement: Static artifact exclusions SHALL preserve availability behavior

An `artifact-exists` exclusion without `parameter` MUST retain its existing
menu, diagnostic, and execute-mode filtering behavior.

#### Scenario: Static target exists during menu evaluation

- **WHEN** menu availability evaluates a parameter-independent artifact target that already exists
- **THEN** the matching source unit SHALL be excluded according to the existing rule

#### Scenario: Static target does not exist

- **WHEN** a parameter-independent artifact target does not exist
- **THEN** the source unit SHALL retain its existing availability and execute eligibility

### Requirement: Artifact target parameter declarations SHALL be authoritative

When an artifact target path depends on a workflow parameter, the manifest MUST
declare that parameter. Target resolution MUST read the confirmed value using
`rule.parameter` and MUST NOT infer the parameter name from a workflow id,
target kind, parameter value, locale, or persisted default.

#### Scenario: Explicit parameter declaration is evaluated

- **WHEN** execute-mode validation evaluates a parameter-dependent artifact exclusion
- **THEN** it SHALL resolve the target from `workflowParams[rule.parameter]`

#### Scenario: Parameterized target omits its parameter declaration

- **WHEN** a workflow manifest declares a target kind that requires a workflow parameter but omits `parameter`
- **THEN** manifest validation SHALL reject the ambiguous rule

