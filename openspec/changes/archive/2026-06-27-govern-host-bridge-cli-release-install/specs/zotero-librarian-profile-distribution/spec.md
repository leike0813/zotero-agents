## ADDED Requirements

### Requirement: Profile Distribution Reuses Published CLI Prebuilds

The zotero-librarian profile publishing path SHALL restore the latest Host Bridge CLI prebuilds before publishing profile artifacts and SHALL verify that the local addon binary layout is complete.

#### Scenario: Profile publish without CLI source change

- **WHEN** profile or wrapper content changes without CLI build input changes
- **THEN** the profile publishing workflow syncs the latest published CLI prebuilds
- **AND** validates the expected platform binary and checksum files
- **AND** publishes the profile without rebuilding the CLI

### Requirement: Profile Manifest Identifies CLI Source Version

The profile distribution SHALL expose enough release metadata to identify which Host Bridge CLI prebuild set is included.

#### Scenario: Profile artifact is published

- **WHEN** the profile repository is published
- **THEN** the publishing job has restored a complete prebuild set from `host-bridge-cli-prebuilds`
- **AND** the CLI release manifest in the source repository records the version/checksum set used by that publish
