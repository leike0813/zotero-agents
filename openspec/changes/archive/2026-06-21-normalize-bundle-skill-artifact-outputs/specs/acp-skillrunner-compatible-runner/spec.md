## ADDED Requirements

### Requirement: Bundle outputs SHALL declare artifact manifests with schema roles

Bundle-producing SkillRunner-compatible outputs SHALL identify a flat artifact manifest path with `x-type: "artifact"` and `x-role: "artifact-manifest"` when the output needs multiple downstream artifact files.

#### Scenario: Artifact manifest role is discovered from output schema

- **WHEN** a successful bundle result validates against an output schema
- **AND** a top-level string field is annotated with `x-type: "artifact"` and `x-role: "artifact-manifest"`
- **THEN** a SkillRunner backend MAY treat that field value as the run's artifact manifest path
- **AND** it SHALL include the manifest file and every file listed in the manifest in the returned bundle.

#### Scenario: Flat artifact manifest is valid

- **WHEN** the backend reads an artifact manifest
- **THEN** the manifest SHALL be a flat JSON object
- **AND** each value SHALL be a non-empty workspace-relative path string
- **AND** values SHALL NOT be absolute paths or contain path traversal.

#### Scenario: Invalid artifact manifest blocks bundle assembly

- **WHEN** the manifest path is missing, unreadable, non-object, nested, contains arrays, contains empty values, or contains unsafe paths
- **THEN** bundle assembly SHALL fail with a deterministic diagnostic naming the invalid manifest entry.
