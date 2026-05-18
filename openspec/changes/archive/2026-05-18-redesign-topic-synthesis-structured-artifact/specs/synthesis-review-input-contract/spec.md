# synthesis-review-input-contract Delta

## MODIFIED Requirements

### Requirement: Review workflows consume stable Synthesis Layer inputs

Review workflow input SHALL remain compatible with Markdown-consuming workflows
while exposing structured topic synthesis content for future workflows.

#### Scenario: Review input is requested for a structured topic

- **WHEN** a review workflow input is requested for a topic with a structured
  artifact
- **THEN** the response SHALL include the Markdown export for compatibility
- **AND** it SHALL include structured topic content with claims, timeline,
  evidence, coverage, gaps, and external literature analysis.

#### Scenario: Review input is requested for a legacy Markdown topic

- **WHEN** a review workflow input is requested for a topic without a structured
  artifact
- **THEN** the response SHALL fail with or return a bounded `needs_recreate`
  state
- **AND** it SHALL NOT silently use old `current.md` as a v2 review source.
