## ADDED Requirements

### Requirement: Runtime bundle SHALL include transfer implementation inputs
The service build, runtime bundle manifest, and build fingerprint SHALL include the transfer contract, engine page validators, service owner, server dispatch, and their source inputs.

#### Scenario: Runtime bundle is inspected
- **WHEN** the sidecar service is compiled and packaged
- **THEN** the emitted transfer modules are present and fingerprinted with the existing contracts, engine, service, lockfile, and dependency inputs

#### Scenario: Dependencies are inspected
- **WHEN** transfer staging is packaged
- **THEN** no new runtime dependency or license is required
