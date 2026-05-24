## ADDED Requirements

### Requirement: Structured topic artifacts preserve staged section semantics

The structured topic artifact SHALL be assembled from sections that passed
their authoring-stage semantic validation.

#### Scenario: Route and timeline sections are persisted

- **WHEN** final topic sections include `taxonomy` and `timeline_events`
- **THEN** those sections SHALL match the Stage 7 validated route/timeline
  artifact unless explicitly replaced by a valid patch.

#### Scenario: Core analytical sections are persisted

- **WHEN** final topic sections include claims, comparison, debates, gaps,
  positioning, or review outline
- **THEN** those sections SHALL match the Stage 8 validated core artifact unless
  explicitly replaced by a valid patch.
