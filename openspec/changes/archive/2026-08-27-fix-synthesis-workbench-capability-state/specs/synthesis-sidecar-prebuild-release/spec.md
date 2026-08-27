## ADDED Requirements

### Requirement: Prebuild verification SHALL exercise current production seams deterministically

Every matrix member configured for native smoke SHALL construct its candidate
launch input through the shared current launch-config contract and SHALL
exercise the production repository, canonical store, reverse Host probe,
Workbench read, shutdown, and reopen process boundary before its archive is
accepted. Platform-sensitive tests run by the workflow SHALL synchronize
observable lifecycle events and SHALL release repository and canonical owners
before removing their storage.

#### Scenario: A native candidate is smoked

- **WHEN** a native-smoke matrix member launches its packaged Rust candidate
- **THEN** the smoke SHALL use a shared-contract-valid launch configuration
- **AND** it SHALL verify the current production health and persistence paths
- **AND** successful shutdown SHALL permit the same source to reopen cleanly

#### Scenario: Platform scheduling and file ownership differ

- **WHEN** prebuild tests run under slower thread scheduling or Windows SQLite
  file locking
- **THEN** deadline evidence SHALL synchronize task start and completion
- **AND** temporary storage SHALL be removed only after all owning handles drop
