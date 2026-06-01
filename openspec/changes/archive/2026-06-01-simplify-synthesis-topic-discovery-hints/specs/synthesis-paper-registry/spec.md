## MODIFIED Requirements

### Requirement: Discovery hints are reject-only suggestions

Discovery hints SHALL use only `open`, `rejected`, and `superseded` states.

#### Scenario: User rejects a discovery hint

- **WHEN** a user rejects a topic-literature discovery hint
- **THEN** the pair SHALL remain suppressed across digest rerun, metadata hash
  drift, and Registry rebuild
- **AND** it SHALL reopen only through explicit restore, reset, or force repair.

#### Scenario: Legacy statuses are read

- **WHEN** legacy `filtered` or `accepted` discovery hint statuses are read or
  migrated
- **THEN** `filtered` SHALL normalize to `rejected`
- **AND** `accepted` SHALL normalize to `open`.
