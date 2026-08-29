## ADDED Requirements

### Requirement: Canonical merge review SHALL apply component intent atomically

Accept, reverse accept, and manual canonical target decisions SHALL be planned against the current effective redirect component rather than the selected proposal status alone. A newer explicit decision SHALL displace conflicting materialized facts and their accepted proposal state in the same transaction.

#### Scenario: Open duplicate is reverse accepted after a sibling was accepted
- **WHEN** one proposal has materialized `source -> target` and an open sibling for the same pair is reverse accepted
- **THEN** the application SHALL make `source` the effective canonical
- **AND** remove the conflicting forward fact
- **AND** supersede the displaced accepted sibling
- **AND** persist the reverse audit as accepted in one transaction.

#### Scenario: Reverse is repeated
- **WHEN** the requested canonical is already the root selected by the same reverse decision
- **THEN** the application SHALL return idempotent success without adding another redirect or audit proposal.

#### Scenario: Review proposals become redundant
- **WHEN** a committed decision makes an open canonical merge proposal semantically redundant within the same resolved component
- **THEN** the application SHALL supersede that proposal so the user is not asked to resolve an already-settled relationship.

