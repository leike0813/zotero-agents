# Spec Delta

## ADDED Requirements

### Requirement: Topic Structured Artifact engine SHALL recognize optional comparison matrix sections

The structured-artifact engine SHALL recognize `comparison_matrix` as a canonical Topic section for assembly and section-patch validation when present, while keeping it optional for complete newly authored artifacts.

#### Scenario: Existing optional comparison matrix is patched
- **WHEN** a valid patch replaces the current canonical `comparison_matrix` with matching read and replace hashes
- **THEN** the engine accepts the section as patchable and applies it under the existing patch contract

#### Scenario: New artifact omits comparison matrix
- **WHEN** a complete newly authored artifact contains `improvement_dimensions` and omits `comparison_matrix`
- **THEN** validation succeeds when all required sections are present
- **AND** the engine does not synthesize a required matrix field

#### Scenario: TypeScript and Rust recognize the same canonical section set
- **WHEN** cross-language structured-artifact contracts are checked
- **THEN** both engines agree with the canonical Topic schema on recognized sections and optionality
