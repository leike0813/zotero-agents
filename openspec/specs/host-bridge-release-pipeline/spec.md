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
