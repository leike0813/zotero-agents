# topic-details-ui Delta

## MODIFIED Requirements

### Requirement: Coverage display

Topic Details SHALL render coverage from the minimal coverage section and SHALL
not display duplicate coverage summary blocks.

#### Scenario: Coverage page uses current fields

- **WHEN** a topic detail contains the minimal coverage section
- **THEN** the Coverage page displays verdict, reason, caveats, external context
  summary, and collection directions
- **AND** it does not render route/claim/timeline coverage summary cards,
  reliability blocks, or representative references
