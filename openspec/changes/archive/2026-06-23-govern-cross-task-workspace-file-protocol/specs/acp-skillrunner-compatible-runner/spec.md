## MODIFIED Requirements

### Requirement: Output Artifact Manifest Identity Uses X-Type

Bundle-producing SkillRunner-compatible outputs SHALL identify artifact manifest
fields with `x-type: "artifact-manifest"`.

#### Scenario: Artifact manifest x-type is discovered from output schema

- **GIVEN** a successful result validates against an output schema
- **AND** a top-level string field is annotated with `x-type: "artifact-manifest"`
- **THEN** the plugin SHALL treat that field value as an artifact manifest path
- **AND** it SHALL NOT require `x-role` to equal any specific value.

#### Scenario: Artifact role string does not define manifest identity

- **GIVEN** a top-level string field is annotated with `x-type: "artifact"`
- **AND** `x-role` is `artifact-manifest`
- **THEN** the plugin SHALL treat the field as a single artifact path
- **AND** it SHALL NOT expand the field value as an artifact manifest.
