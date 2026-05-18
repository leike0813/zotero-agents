## ADDED Requirements

### Requirement: Topic Detail Consumes Current Structured Review Sections

The UI SHALL consume the structured sections already returned by
`readTopicDetail` without requiring persistence or DTO contract changes.

#### Scenario: Optional review-oriented section is missing

- **GIVEN** a topic detail DTO omits an optional structured section
- **WHEN** Topic Detail renders the corresponding tab
- **THEN** the tab SHALL show a compact empty state
- **AND** it SHALL NOT render raw JSON as the primary user experience.
