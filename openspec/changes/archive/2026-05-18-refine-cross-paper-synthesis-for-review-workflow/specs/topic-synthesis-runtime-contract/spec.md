# topic-synthesis-runtime-contract

## ADDED Requirements

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
