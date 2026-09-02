## ADDED Requirements

### Requirement: Windows prebuilds SHALL retain matching durable symbols

Every fresh Windows prebuild SHALL produce a deterministic gzip PDB and strict
manifest under `symbols/<buildFingerprint>/win32-x64/` on the existing prebuild
branch. The publisher SHALL copy or byte-verify that directory in the same
commit as the seven-runtime set. Symbols SHALL NOT enter runtime bundles, the
seven-platform aggregate, XPI contents, or release-result contracts.

#### Scenario: A Windows cache run has no symbols
- **WHEN** cache resolution finds a runtime artifact without its matching symbol artifact
- **THEN** Windows is a cache miss and is rebuilt
- **AND** other platform candidates remain reusable

#### Scenario: The compressed PDB exceeds the storage gate
- **WHEN** symbol packaging exceeds the configured pre-Git-hosting size limit
- **THEN** the prebuild fails explicitly without falling back to ephemeral-only symbols
