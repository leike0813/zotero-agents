# topic-details-ui Delta

## MODIFIED Requirements

### Requirement: Topic details overview summary

The Overview page SHALL show the summary text and key takeaways when present.

#### Scenario: Key takeaways are visible

- **WHEN** a topic detail contains `summary.key_takeaways`
- **THEN** Overview renders those entries as takeaways.

### Requirement: Future directions page

Topic Details SHALL expose future research directions as a dedicated page.

#### Scenario: Future directions render separately from coverage

- **WHEN** a topic artifact contains `future_directions`
- **THEN** Topic Details tabs include `Future Directions`
- **AND** the Future Directions page renders limitation, future direction,
  rationale, direction type, and source chips
- **AND** the Coverage page does not render future directions.

### Requirement: Debate body text

Debate cards SHALL render the current judgment when available.

#### Scenario: Debate uses current judgment

- **WHEN** a debate row contains `current_judgment`
- **THEN** Topic Details renders that text as the debate body.
