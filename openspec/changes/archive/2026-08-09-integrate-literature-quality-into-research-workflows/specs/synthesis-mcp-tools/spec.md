## ADDED Requirements

### Requirement: Paper artifact APIs default to the complete paper artifact set

`paper_artifacts.get_manifest`, `paper_artifacts.read`, and `paper_artifacts.export_filtered` SHALL default to all four paper artifact types while retaining explicit filtering.

#### Scenario: Artifact types are omitted
- **WHEN** a caller omits `artifact_types`
- **THEN** the response SHALL cover digest, references, citation analysis, and literature score.

#### Scenario: Literature score is exported
- **WHEN** a valid score artifact is included in a filtered export
- **THEN** its complete decoded payload SHALL be written without content filtering
- **AND** manifest schema version SHALL be `1.1.0`
- **AND** the manifest paper entry SHALL include the compact `literature_quality` snapshot.
