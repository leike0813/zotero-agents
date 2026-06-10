# topic-synthesis-skills Delta

## MODIFIED Requirements

### Requirement: Core synthesis payload

Stage 40 core synthesis SHALL author review-writing strategies and SHALL NOT
author a top-level `positioning` payload field.

#### Scenario: Stage 40 current payload shape

- **WHEN** the core enrichment skill renders Stage 40 instructions and schema
- **THEN** the payload requires `review_outline`
- **AND** the payload does not include `positioning`
- **AND** `review_outline.writing_strategies[]` requires `id`, `title`,
  `review_thesis`, `writing_strategy`, `section_plan`, `best_for`, `risks`,
  and `source_paper_refs`
- **AND** `recommended_strategy_id` must match a strategy id
