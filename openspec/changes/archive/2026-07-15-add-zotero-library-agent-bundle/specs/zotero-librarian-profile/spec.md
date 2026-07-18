## ADDED Requirements

### Requirement: Zotero Librarian profile SHALL retain a resident maintenance task model
The Zotero Librarian profile SHALL remain the Hermes-specific surface for continuous library maintenance in a fixed workspace and SHALL NOT be treated as the general third-party agent bundle.

#### Scenario: Profile performs resident work
- **WHEN** Hermes runs index refresh, workflow catalog refresh, notification synchronization, run monitoring, inbox triage, or library hygiene
- **THEN** the profile SHALL use its profile-owned state, scripts, cron configuration, and maintenance policy.

#### Scenario: Shared protocol facts are rendered
- **WHEN** the profile consumes shared Host Bridge control invariants
- **THEN** those protocol facts SHALL match the CLI wrapper and general library agent copies
- **AND** the profile SHALL retain its independent resident task policy.
