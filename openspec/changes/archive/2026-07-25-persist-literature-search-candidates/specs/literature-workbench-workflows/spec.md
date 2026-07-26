## ADDED Requirements

### Requirement: Workflow research dispatch SHALL pass candidate file paths

The workflow's static research prompt SHALL use `CANDIDATE_FILES_JSON` for one
or more approved candidate file paths and `TARGET_COLLECTION` for the selected
collection. Each candidate file SHALL provide the candidate identity and its
single-paper Host payload path.

#### Scenario: Dynamic dispatch uses candidate files

- **WHEN** the main agent constructs a research dispatch after Stage 30
- **THEN** it SHALL provide the selected candidate file paths
- **AND** the subagent SHALL read candidate data from those files
- **AND** the dispatch SHALL not require an aggregate candidate object or an
  `OUTPUT_PATHS_JSON` map

#### Scenario: Candidate file remains the handoff identity

- **WHEN** a subagent researches a candidate file
- **THEN** it SHALL preserve that file's candidate identity
- **AND** it SHALL use that file's `payloadPath` for the resulting Host payload
- **AND** it SHALL not replace the candidate with another direct work
