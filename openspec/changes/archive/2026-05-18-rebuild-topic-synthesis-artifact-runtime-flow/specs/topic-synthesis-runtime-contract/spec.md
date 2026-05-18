# topic-synthesis-runtime-contract

## ADDED Requirements

### Requirement: Runtime stores manifests but not long artifact bodies

The topic synthesis runtime SHALL keep SQLite as process state and manifest
state, not as storage for long artifact or synthesis bodies.

#### Scenario: Artifact manifest is persisted

- **WHEN** `persist_filtered_artifact_manifest` receives the filtered export
  manifest
- **THEN** SQLite SHALL store each paper artifact status, provenance, content
  path, and hashes
- **AND** it SHALL NOT store digest Markdown bodies, references JSON bodies,
  citation report bodies, `decoded_text`, or full payload objects.

#### Scenario: Cross-paper context reads filtered files

- **WHEN** `export_cross_paper_context` runs
- **THEN** it SHALL read filtered artifact content files referenced by the
  manifest
- **AND** it SHALL validate that each path stays inside the run workspace
- **AND** it SHALL validate each `content_hash`.

### Requirement: Final artifacts are file-authored and validated

Final topic synthesis sections SHALL be authored as files and then validated by
runtime scripts.

#### Scenario: Final artifacts validate successfully

- **WHEN** `validate_final_artifacts` runs
- **THEN** it SHALL validate required section JSON files, evidence references,
  and operation-specific completeness
- **AND** it SHALL generate `result/topic-analysis.json` or
  `result/topic-analysis.patch.json`
- **AND** it SHALL generate `result/result.json` and register hashes.

#### Scenario: Invalid paper analysis is rejected

- **WHEN** `persist_paper_analyses` receives an analysis row that contradicts
  artifact availability
- **THEN** it SHALL reject the row with an error naming the `paper_ref`, field,
  artifact status, and repair guidance.
