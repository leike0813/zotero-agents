## ADDED Requirements

### Requirement: Dispatch settlement publishes only after local results are readable

Dispatch settlement SHALL make job state, raw result, error and metadata readable before notifying its backend settlement owner. Generic job update notifications SHALL NOT independently infer canonical backend events for that same dispatch settlement.

#### Scenario: Canonical success observers read the completed local result

- **WHEN** a successful non-deferred dispatch publishes its canonical run event
- **THEN** subscribers SHALL already be able to read the successful job and complete provider result
- **AND** foreground Host apply SHALL remain owned by the existing apply seam

#### Scenario: Recoverable failure has one semantic settlement

- **WHEN** a ready SkillRunner request loses foreground observation through a recoverable failure
- **THEN** the SkillRunner owner SHALL record observer detachment and retain the request for recovery
- **AND** generic queue notifications SHALL NOT first publish a competing backend terminal event or snapshot inferred from the local error

#### Scenario: Settlement observer fails

- **WHEN** a settlement callback throws after the job result has been stored
- **THEN** its error SHALL be diagnosed separately without replacing the execution outcome or replaying settlement
- **AND** dispatch capacity and idle waiters SHALL still be released
