# synthesis-mcp-tools

## ADDED Requirements

### Requirement: Review input returns structured topic synthesis content

`synthesis.get_review_input` SHALL return the review-oriented topic synthesis
sections when present.

#### Scenario: Structured review input is requested

- **WHEN** a caller requests review input for a topic with a current structured
  artifact
- **THEN** the response SHALL include the current artifact sections, including
  positioning, taxonomy, comparison matrix, debates, review outline, and
  evidence map.
