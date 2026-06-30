# host-bridge-release-pipeline Specification

## Purpose
TBD - created by syncing change add-zotero-librarian-hermes-profile. Update Purpose after archive.

## Requirements

### Requirement: Host Bridge release pipeline publishes Zotero librarian profile

The Host Bridge release pipeline SHALL publish the `zotero-librarian` Hermes
profile distribution when profile, Host Bridge CLI, profile guidance, workflow
catalog, or CLI prebuild inputs change.

#### Scenario: GitHub release workflow publishes both surfaces

- **WHEN** the Host Bridge CLI GitHub workflow restores all prebuilt binaries
- **THEN** it SHALL publish the existing `host-bridge/zotero-bridge-cli-bundle`
  branch
- **AND** it SHALL publish `leike0813/zotero-librarian-profile` from the same
  source commit and prebuild set.

#### Scenario: Local release instructions mention profile checks

- **WHEN** the host bridge release-pipeline skill is read
- **THEN** it SHALL instruct agents to run the profile render/check path after
  capability, CLI, workflow catalog, profile, or documentation changes
- **AND** its report checklist SHALL include standalone profile repository publication and
  profile binary checksum synchronization.

#### Scenario: Local release instructions avoid duplicate main dispatch

- **WHEN** Host Bridge release changes are published to `main` and match the
  Host Bridge CLI GitHub workflow paths
- **THEN** the host bridge release-pipeline skill SHALL instruct agents to use
  the automatic `push` workflow run as the release run
- **AND** it SHALL reserve manual `workflow_dispatch` for recovery or explicit
  republish cases.

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

### Requirement: Plugin Release Verifies CLI Prebuild Freshness

The plugin release workflow SHALL verify restored Host Bridge CLI prebuilds against the CLI release manifest before building the XPI.

#### Scenario: Manifest fingerprint is stale

- **WHEN** `cli/zotero-bridge/release.json` records a build fingerprint different from current CLI build inputs
- **THEN** the release workflow fails before `npm run test:gate:release`

#### Scenario: Binary checksum is stale

- **WHEN** any restored `addon/bin` CLI binary differs from its `.sha256` sidecar or release manifest checksum
- **THEN** the release workflow fails before building the XPI

#### Scenario: Release gate remains unchanged

- **WHEN** release validation runs
- **THEN** CLI prebuild freshness is executed as a release workflow step
- **AND** it is not added to `test:gate:release`
