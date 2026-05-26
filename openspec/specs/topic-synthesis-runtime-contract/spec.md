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

### Requirement: Topic synthesis validates content at the authoring stage

The topic synthesis runtime SHALL validate each semantic content family at the
stage where that content is first authored.

#### Scenario: Route and timeline content is shallow

- **WHEN** `persist_route_timeline` receives taxonomy or timeline content that
  lacks required semantic depth
- **THEN** the runtime SHALL reject it before registering
  `route_timeline_synthesis_hash`
- **AND** it SHALL NOT advance to Stage 8.

#### Scenario: Core analytical content is shallow

- **WHEN** `persist_core_sections` receives claims, debates, gaps, comparison,
  positioning, or review outline content that lacks required semantic depth
- **THEN** the runtime SHALL reject it before registering
  `core_analytical_sections_hash`
- **AND** it SHALL NOT advance to Stage 9.

### Requirement: Final section assembly is payload-first

Stage 9 SHALL read and validate a run-local payload before writing final
`result/sections/*.json` files.

#### Scenario: Stage 9 payload is invalid

- **WHEN** `persist_external_statistics_report` receives no payload, a payload
  without `sections`, or shallow external/statistics/report content
- **THEN** the runtime SHALL reject the action
- **AND** it SHALL NOT write final section files or advance to Stage 10.

#### Scenario: Stage 9 payload is valid

- **WHEN** the Stage 9 payload and merged section view pass validation
- **THEN** the runtime SHALL materialize `result/sections/*.json`
- **AND** advance to Stage 10.

### Requirement: Final validation remains a complete parity check

`validate_final_artifacts` SHALL continue to validate schema, evidence closure,
digest refs, registry hashes, and final bundle generation even after Stage 9
prevalidation succeeds.

#### Scenario: Final section file is polluted after Stage 9

- **WHEN** a registered final section file is modified before Stage 10
- **THEN** final validation SHALL fail before writing `result/result.json`.

### Requirement: Runtime payload contracts SHALL be executable from documented skill instructions
Topic synthesis skill instructions and reference examples MUST describe the payload keys enforced by the package-local runtime validators.

#### Scenario: Citation metrics payload declares requested paper refs
- **WHEN** an agent persists citation graph metrics for a paper batch
- **THEN** the documented payload SHALL include top-level `paper_refs[]`
- **AND** `persist_citation_graph_metrics` SHALL be invoked with that payload file.

#### Scenario: Filtered artifact manifest preserves observed payload types
- **WHEN** filtered paper artifacts are exported to the run workspace
- **THEN** every manifest artifact row SHALL include `payload_types_seen[]`
- **AND** rows without observed payload evidence SHALL use an empty array.

#### Scenario: Paper units use the runtime analysis batch contract
- **WHEN** an agent persists paper-unit analyses
- **THEN** the documented payload SHALL use top-level `analyses[]`
- **AND** each analysis SHALL include the required paper analysis row fields enforced by `paper_analysis_row.schema.json`.

#### Scenario: Cross-paper evidence map documents validator-required fields
- **WHEN** an agent writes the cross-paper evidence map
- **THEN** the documented payload SHALL include `schema_id`, `schema_version`, `evidence_limits`, `taxonomy_candidates[]`, `comparison_dimensions[]`, `claim_candidates[]`, `debate_candidates[]`, `gap_candidates[]`, `review_outline_seeds[]`, and `diagnostics[]`
- **AND** the documented candidate reference keys SHALL match runtime validation.

### Requirement: Runtime validates KG proposal sidecars before final render

The topic synthesis runtime SHALL validate and register KG proposal sidecars before final artifact validation.

#### Scenario: KG proposal payload is persisted

- **WHEN** `persist_kg_proposals` receives a valid combined KG proposal payload
- **THEN** runtime SHALL write concept cards to `result/sidecars/concept-cards-proposal.json`
- **AND** write topic graph relation proposals to `result/sidecars/topic-graph-relation-proposals.json`
- **AND** register both artifacts with hashes.

#### Scenario: Final validation runs without KG sidecars

- **WHEN** `validate_final_artifacts` runs for a completed create/update result and either KG sidecar is missing or hash-mismatched
- **THEN** runtime SHALL reject final validation before writing `result/result.json`.

