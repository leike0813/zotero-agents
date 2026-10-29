## ADDED Requirements

### Requirement: Literature analysis SHALL render matching metadata from clean Skill content

Full literature analysis SHALL render a bare `literature_matching_metadata.v1` artifact from its persisted metadata using unmodified Skill content, including after a shared catalog rebuild. The artifact SHALL retain the required fields, string-array types, per-field cardinality limits and rejection of unknown fields. Its existing conversion to the closed Synthesis wire contract SHALL remain valid.

#### Scenario: Full output is rendered in a fresh catalog

- **GIVEN** valid persisted full-analysis state and a newly materialized catalog
- **WHEN** final output rendering runs
- **THEN** digest, References, Citation, matching metadata and score SHALL have readable artifact paths
- **AND** matching metadata SHALL be the bare artifact rather than a template-context wrapper.

#### Scenario: Another Skill changes catalog identity

- **GIVEN** valid literature-analysis Skill content
- **WHEN** an unrelated Skill change creates another shared catalog
- **THEN** the copied matching-metadata schema SHALL still accept the emitted bare artifact without a cache edit.

#### Scenario: Invalid metadata is presented for rendering

- **WHEN** matching metadata has a missing required field, a wrong field type, an oversized array, an unknown field or a context wrapper
- **THEN** artifact validation SHALL reject it.

#### Scenario: Rendered metadata reaches the sidecar

- **WHEN** valid full-analysis artifacts are applied through the existing workflow and Host facade
- **THEN** the existing conversion SHALL submit `synthesis.literature_matching_metadata.v1` to the real sidecar
- **AND** canonical References, Citation, score, managed-note writes and reopen idempotency SHALL retain their existing contracts.
