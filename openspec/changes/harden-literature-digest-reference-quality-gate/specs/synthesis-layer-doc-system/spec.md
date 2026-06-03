## ADDED Requirements

### Requirement: Active Docs SHALL Describe Reference Quality Responsibility Boundaries
Active docs SHALL describe the distinction between skill extraction quality,
workflow apply fallback filtering, and Synthesis sidecar ingestion.

#### Scenario: Developer reads reference quality docs
- **WHEN** active docs describe literature-digest references entering Synthesis
- **THEN** they SHALL state that the skill should own extraction quality
- **AND** workflow apply only removes deterministic bad rows before note writing
- **AND** Synthesis sidecar ingestion only provides a fallback deterministic skip for legacy/imported inputs.

#### Scenario: Developer reads skill upgrade guidance
- **WHEN** active docs or artifacts describe the external literature-digest Stage 4 gate
- **THEN** they SHALL distinguish hard-block defects from soft warning defects
- **AND** they SHALL recommend preserving the existing references array compatibility shape.
