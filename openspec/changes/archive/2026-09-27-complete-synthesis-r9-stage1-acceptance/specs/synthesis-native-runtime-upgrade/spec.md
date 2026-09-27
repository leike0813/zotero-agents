## ADDED Requirements

### Requirement: Final acceptance SHALL exercise installation and migration boundaries

The final native-only candidate SHALL be exercised with clean and existing
profiles, offline installation, XPI upgrade, corrupt and wrong-platform
bundles, compatible existing data, registered migration success, backup
failure, migration failure, and unknown schema variants. Every failure case
MUST fail closed without publishing discovery or damaging the prior production
basis.

#### Scenario: Existing profile upgrades successfully
- **WHEN** the candidate opens a supported existing profile requiring a
  registered migration
- **THEN** a verified backup is created, the migration publishes atomically,
  and restart observes the migrated durable facts

#### Scenario: Bundle or migration input is invalid
- **WHEN** installation sees corrupt or wrong-platform bytes, or migration sees
  an unsupported or failing source
- **THEN** startup fails with the stable category before readiness
- **AND** the previous runtime and production basis remain recoverable

### Requirement: Acceptance samples SHALL protect original data

Existing-data and legacy migration rehearsals SHALL use isolated copies and
read-only source snapshots. Receipts SHALL contain only approved identities,
schema facts, counts, statuses, and hashes and MUST NOT expose user content.

#### Scenario: Existing-data rehearsal completes
- **WHEN** migration, restart, ownership, and representative read checks finish
- **THEN** the original sample database and canonical-tree hashes remain
  byte-identical to their pre-test values
