# topic-details-ui Delta

## MODIFIED Requirements

### Requirement: Topic details overview summary

The Overview page SHALL render topic boundary from `topic.scope_boundary` and
review-writing guidance from `review_outline`.

#### Scenario: Overview renders review strategy blueprint

- **WHEN** a topic detail contains `review_outline.topic_importance` and
  `review_outline.writing_strategies`
- **THEN** Overview renders topic importance
- **AND** it renders each writing strategy with thesis, strategy, section plan,
  best-for, risks, and source chips
- **AND** Overview does not render a positioning dashboard
