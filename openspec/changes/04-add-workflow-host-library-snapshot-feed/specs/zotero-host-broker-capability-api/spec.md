## ADDED Requirements

### Requirement: Broker snapshot sessions SHALL bind immutable read basis
The Broker SHALL bind each snapshot identity and cursor to the resolved library, scope, schema, stable ordering, captured item set, and process identity. A changed basis, foreign cursor, expired session, or hard-cap violation SHALL fail without returning completed evidence.

#### Scenario: Cursor belongs to another snapshot
- **WHEN** a cursor from one snapshot is submitted with another snapshot identity
- **THEN** the Broker rejects the request before returning item data

### Requirement: Broker SHALL issue completion evidence only after full delivery
The Broker SHALL issue completion evidence only after every item in the captured set has been delivered through the selected projection and the terminal cursor is exhausted. Evidence SHALL bind the snapshot basis and delivered revisions.

#### Scenario: Callback cancels after receiving a batch
- **WHEN** a trusted Workflow callback cancels before full delivery
- **THEN** the terminal result is incomplete and includes no promotion-capable completion evidence
