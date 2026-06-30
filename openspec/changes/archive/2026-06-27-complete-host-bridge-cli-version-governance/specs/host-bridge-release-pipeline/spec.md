## ADDED Requirements

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
