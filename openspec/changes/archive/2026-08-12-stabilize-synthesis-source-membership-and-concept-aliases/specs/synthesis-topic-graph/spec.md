## ADDED Requirements

### Requirement: Discovery hints preserve applied screening outcomes

Topic discovery hints SHALL distinguish open candidates, accepted source membership, evidence-based screening, explicit user rejection, and supersession.

#### Scenario: Accepted candidate remains terminal

- **WHEN** a successful topic update accepts a discovery hint
- **THEN** its status SHALL remain `accepted` during later discovery rebuilds.

#### Scenario: Unchanged screened candidate remains terminal

- **GIVEN** a hint is `screened_out` with an evidence basis
- **WHEN** discovery rebuild produces the same basis
- **THEN** the hint SHALL remain screened out with its recorded outcome.

#### Scenario: Changed screening basis reopens candidate

- **GIVEN** a hint is `screened_out`
- **WHEN** relevant topic metadata, literature metadata, discovery profile, or policy changes its evidence basis
- **THEN** the hint SHALL reopen for semantic triage.

#### Scenario: Explicit rejection remains durable

- **WHEN** discovery rebuild encounters a user-rejected hint
- **THEN** it SHALL preserve `rejected` regardless of screening basis changes.
