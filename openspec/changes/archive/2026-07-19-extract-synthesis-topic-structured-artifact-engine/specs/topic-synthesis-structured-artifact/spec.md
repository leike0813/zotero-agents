## ADDED Requirements

### Requirement: Host structured artifact computation SHALL route through the configured engine

Host apply SHALL use the configured Topic Structured Artifact engine for
manifest validation, section patch computation, artifact assembly, and artifact
validation.

#### Scenario: Complete artifact is applied
- **WHEN** Host apply reads a valid complete manifest and its sections
- **THEN** the configured engine SHALL assemble and validate the artifact before canonical persistence
- **AND** the persisted artifact shape SHALL remain unchanged.

### Requirement: Current evidence links use source paper references

Current evidence links SHALL use `source_paper_refs` to identify rows in the
artifact's `source_papers` section for claims, timeline events, debates, future
directions, improvement dimensions, taxonomy entries, and review-outline
entries.

#### Scenario: Referenced source paper is missing
- **WHEN** a required `source_paper_refs` value does not identify a current `source_papers` row
- **THEN** structured artifact validation SHALL reject the artifact before apply.

### Requirement: Current complete sections SHALL exclude removed sections

Current complete manifests and artifacts SHALL exclude
`improvement_dimension_summary`, `external_literature_analysis`, `gaps`, and
`positioning`.

#### Scenario: Removed section is present
- **WHEN** a complete manifest or assembled artifact contains a removed section
- **THEN** structured artifact validation SHALL reject it.

## REMOVED Requirements

### Requirement: Claims and timeline events use library paper evidence

**Reason**: The current contract replaced embedded `paper_evidence` with
`source_papers` plus `source_paper_refs`.

**Migration**: Use the added current evidence-link requirement.

### Requirement: External literature is analyzed separately

**Reason**: `external_literature_analysis` is not a current complete section;
coverage and report content carry current limitations and analysis.

**Migration**: Use the current complete-section and content-depth requirements.
