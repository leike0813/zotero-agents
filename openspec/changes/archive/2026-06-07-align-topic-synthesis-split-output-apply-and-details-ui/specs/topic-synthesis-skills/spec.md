## ADDED Requirements

### Requirement: Split create runtime is gate-directed

The generated topic synthesis split-skill packages SHALL support a real
gate-directed create runtime path.

#### Scenario: Finalize produces Host-apply-ready topic synthesis output

- **WHEN** finalize receives the core handoff and completes its payload stages
- **THEN** runtime SHALL materialize a complete `result/sections/*.json` section
  set for the current Host topic artifact contract
- **AND** `result/topic-analysis.json` SHALL be a complete
  `synthesis.topic_analysis_manifest`
- **AND** every manifest section entry SHALL include `path`, `hash`, and
  `content_type: "json"`
- **AND** every manifest sidecar entry SHALL include `path`, `hash`,
  `content_type: "json"`, and `schema_id`
- **AND** `result/final-output.candidate.json` SHALL be a pure
  `kind: "topic_synthesis"` business result without `__SKILL_DONE__`.

## ADDED Requirements

### Requirement: Split topic synthesis apply remains strict and diagnosable

The Host apply path SHALL accept split final candidates only when their
referenced analysis manifest can produce a valid persisted topic artifact.

#### Scenario: Incomplete split manifest is rejected with actionable diagnostics

- **GIVEN** a split final candidate references a create/update_full analysis
  manifest with missing complete-topic sections
- **WHEN** apply validates the manifest
- **THEN** it SHALL reject the result
- **AND** the error SHALL identify the manifest validation failure rather than
  silently downgrading the artifact.

#### Scenario: Manifest sidecar entries can supply sidecar paths

- **GIVEN** a valid complete manifest includes required sidecar entries
- **WHEN** the final candidate omits legacy top-level sidecar path fields
- **THEN** apply SHALL use the manifest sidecar paths for concept cards, topic
  graph relation proposals, and topic interest metadata.

### Requirement: Topic details exposes structured artifact provenance

The topic details page SHALL render complete split-runtime topic artifacts with
clear grouped content and provenance.

#### Scenario: Details page shows split artifact provenance

- **GIVEN** a persisted topic artifact has manifest, metadata, section hashes,
  sidecars, diagnostics, and source artifact references
- **WHEN** the topic details page is opened
- **THEN** it SHALL expose coverage, evidence, report, and provenance summary
- **AND** missing optional legacy fields SHALL render empty states instead of
  blank or broken layouts.
