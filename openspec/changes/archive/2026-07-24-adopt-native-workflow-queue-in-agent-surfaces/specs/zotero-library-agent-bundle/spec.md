## ADDED Requirements

### Requirement: Generic SHALL hand confirmed workflow intent to Host-native admission
Generic workflow policy SHALL turn one bounded Zotero-managed objective into one explicit raw-selection submission and SHALL use Host submission state to follow admission before switching to concrete task/run handles.

#### Scenario: Bounded task chooses a Zotero-managed workflow
- **WHEN** live workflow facts, input planning contracts, provider requirements, options, result contract, and authority are confirmed
- **THEN** Generic SHALL submit the reviewed raw selection once with an explicit Host concurrency choice
- **AND** it SHALL retain the returned `submissionId`

#### Scenario: Submission contains pending work
- **WHEN** active submission inspection reports pending units
- **THEN** Generic MAY request interactive pending cancellation when user intent requires it
- **AND** it SHALL NOT claim ownership of FIFO, queue persistence, resident supervision, or CLI mechanism facts

#### Scenario: Concrete tasks appear
- **WHEN** submission inspection or task filtering returns run handles
- **THEN** Generic SHALL use those handles for bounded completion/evidence work or hand continuous supervision to the hosted facet
