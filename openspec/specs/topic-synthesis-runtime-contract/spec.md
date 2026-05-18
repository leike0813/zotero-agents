# topic-synthesis-runtime-contract Specification

## Purpose
TBD - created by archiving change fix-topic-synthesis-final-bundle-contract. Update Purpose after archive.
## Requirements
### Requirement: Topic intent has stable topic definition

Create and update topic synthesis runtimes MUST reject topic intent payloads
that do not contain `topic_definition.id` and `topic_definition.title`.

#### Scenario: legacy intent object

- **WHEN** the payload only contains `intent`
- **THEN** runtime persistence fails before resolver execution

### Requirement: Final bundle references resolver manifest by path

The final result bundle MUST include `resolver_manifest_path` and MUST NOT
embed `topic_resolver`, `resolution_result`, or `resolved_paper_set`.

#### Scenario: final render

- **WHEN** `validate_final_artifacts` writes `result/result.json`
- **THEN** resolver data is referenced by path and diagnostics are lightweight

### Requirement: Runtime validates evidence-map references

Final topic synthesis sections SHALL be traceable to cross-paper evidence-map
candidates and library paper evidence.

#### Scenario: Final section references are valid

- **WHEN** `validate_final_artifacts` runs
- **THEN** it SHALL validate that claims, taxonomy nodes, comparison rows,
  debates, gaps, and review outline rows reference existing evidence-map
  candidates
- **AND** claims and timeline events SHALL continue to reference known
  `paper_evidence` ids.

#### Scenario: Unsupported gap is rejected

- **WHEN** a final gap claims field-wide significance without supported
  evidence-map references
- **THEN** validation SHALL reject it or require it to be represented as a
  local library coverage gap.

### Requirement: Runtime creates a mechanical evidence index

The runtime SHALL create a mechanical evidence index from validated paper units
after Stage 4.

#### Scenario: Paper analyses are persisted

- **WHEN** `persist_paper_analyses` succeeds
- **THEN** the runtime SHALL write
  `runtime/views/cross-paper-evidence-index.json`
- **AND** the index SHALL contain paper refs, paper-unit ids, availability
  facts, and paper-local extraction fields without script-authored synthesis.

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

