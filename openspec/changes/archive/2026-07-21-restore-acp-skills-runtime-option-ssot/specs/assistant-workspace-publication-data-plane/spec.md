## ADDED Requirements

### Requirement: Canonical live-tail state is independent from on-demand pages

The publication coordinator SHALL maintain one canonical live-tail mutation base per transcript owner. Explicit page responses SHALL add or update page-scoped cache state without replacing that live-tail base. Loading and empty publications SHALL include canonical owner identity in their semantic signature.

#### Scenario: Historical page response does not replace live-tail mutation state

- **GIVEN** an owner has a canonical live-tail page receiving steady mutations
- **WHEN** an on-demand historical page response is published
- **THEN** the response SHALL update only its page-scoped state
- **AND** subsequent tail mutations SHALL continue from the unchanged canonical live-tail base.

#### Scenario: Out-of-order page responses remain owner scoped

- **WHEN** page requests complete out of order for the same selected owner
- **THEN** each response SHALL populate only its requested page identity
- **AND** neither response SHALL replace another page or the canonical tail base.

#### Scenario: Loading state cannot be reused across owners

- **GIVEN** owner A has rendered a loading or empty transcript state
- **WHEN** selection changes to owner B with the same visible loading semantics
- **THEN** the owner-scoped signature SHALL still commit owner B's state
- **AND** no transcript DOM or canonical state from owner A SHALL be retained.

