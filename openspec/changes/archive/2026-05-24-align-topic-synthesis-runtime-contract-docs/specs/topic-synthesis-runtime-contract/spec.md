## ADDED Requirements

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
