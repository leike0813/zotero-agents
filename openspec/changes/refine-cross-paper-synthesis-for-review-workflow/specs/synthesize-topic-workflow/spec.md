# synthesize-topic-workflow

## ADDED Requirements

### Requirement: Per-paper analysis produces validated paper units

The topic synthesis workflow SHALL perform paper-level extraction during Stage
4 before cross-paper synthesis begins.

#### Scenario: Enhanced paper row is persisted

- **WHEN** `persist_paper_analyses` receives a paper analysis row
- **THEN** it SHALL validate paper-local research problem, method contribution,
  evaluation context, findings, limitations, taxonomy hints, and comparison
  facts
- **AND** it SHALL reject rows that infer cross-paper conclusions.

### Requirement: Cross-paper synthesis is evidence-map-first

The workflow SHALL require a validated cross-paper evidence map before final
section authoring.

#### Scenario: Evidence map gates final sections

- **WHEN** Stage 5 begins after cross-paper contexts are exported
- **THEN** the next required semantic action SHALL be authoring
  `runtime/payloads/cross-paper-evidence-map.json`
- **AND** final section validation SHALL fail if the evidence map is missing or
  invalid.
