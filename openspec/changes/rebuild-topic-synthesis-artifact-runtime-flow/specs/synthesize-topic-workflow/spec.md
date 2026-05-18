# synthesize-topic-workflow

## MODIFIED Requirements

### Requirement: Topic synthesis workflows declare required MCP tools

Create and update topic synthesis workflows SHALL declare only the MCP tools
needed by the current workflow contract.

#### Scenario: Create workflow declares filtered export

- **WHEN** the create topic synthesis workflow is loaded
- **THEN** its required MCP tools SHALL include
  `synthesis.export_filtered_paper_artifacts`
- **AND** it SHALL NOT include `synthesis.export_paper_artifact_bundle`.

#### Scenario: Update workflow declares filtered export

- **WHEN** the update topic synthesis workflow is loaded
- **THEN** its required MCP tools SHALL include
  `synthesis.export_filtered_paper_artifacts`
- **AND** it SHALL NOT include `synthesis.export_paper_artifact_bundle`.

## ADDED Requirements

### Requirement: Semantic steps are LLM-authored and script-validated

Topic synthesis skills SHALL distinguish semantic authoring from mechanical
runtime actions.

#### Scenario: Agent writes final sections

- **WHEN** cross-paper context has been exported
- **THEN** the agent SHALL write final section JSON files under
  `result/sections/`
- **AND** scripts SHALL validate those files and generate the final manifest
  and result bundle
- **AND** scripts SHALL NOT author claims, findings, topic relevance, external
  literature analysis, or other semantic content.

#### Scenario: Paper analysis is semantic

- **WHEN** Stage 4 asks for per-paper analysis
- **THEN** the agent SHALL write the analysis batch from filtered artifact
  content files
- **AND** it SHALL NOT create or run scripts that generate semantic analysis
  fields.
