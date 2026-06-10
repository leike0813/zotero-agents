## ADDED Requirements

### Requirement: Stale canonical governance SHALL avoid broad matcher work

Stale canonical lifecycle reconciliation SHALL run only for canonical ids affected by the current sourceRef artifact refresh and SHALL NOT run Advanced Matching or full-library fuzzy matching.

#### Scenario: Harness readonly safety

- **WHEN** the UI harness receives a Canonical Revision accept or reject action
- **THEN** it SHALL mock the action as readonly with blocked reason `db-write`
- **AND** SHALL NOT mutate the plugin database.
