## ADDED Requirements

### Requirement: CLI Builds Are Fingerprint-Gated

The Host Bridge CLI prebuild workflow SHALL run the full platform matrix only when CLI build inputs change or when manually dispatched.

#### Scenario: Wrapper-only change

- **WHEN** only wrapper skill, profile, broker capability, or Host Bridge surface documentation files change
- **THEN** the CLI prebuild workflow is not triggered by those paths
- **AND** no full platform CLI matrix build is required

#### Scenario: CLI build input changes on main

- **WHEN** CLI build inputs change on `main`
- **THEN** the workflow patch-bumps the CLI version
- **AND** builds the platform prebuild matrix
- **AND** records the new fingerprint and binary checksums in the release manifest

#### Scenario: Bump commit retriggers workflow

- **WHEN** the CI-created bump commit triggers the CLI build workflow
- **AND** the manifest fingerprint matches the current build fingerprint
- **THEN** the detect job skips the full platform build

### Requirement: Surface Publishing Reuses Latest Prebuilds

Host Bridge surface/profile publishing SHALL reuse the latest `host-bridge-cli-prebuilds` assets instead of rebuilding the CLI.

#### Scenario: Surface-only publish

- **WHEN** wrapper/profile/surface inputs change
- **THEN** the surface publishing workflow restores the latest CLI prebuilds
- **AND** publishes the Host Bridge CLI bundle branch and zotero-librarian profile
- **AND** does not run the Rust CLI build matrix
