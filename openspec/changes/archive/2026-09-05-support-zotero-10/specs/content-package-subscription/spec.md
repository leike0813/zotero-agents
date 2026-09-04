## MODIFIED Requirements

### Requirement: Official content packages SHALL declare compatibility

Official content packages SHALL declare package version, content API version,
and semver compatibility ranges for plugin, content API, and Zotero runtime.

#### Scenario: Incompatible package is not installed

- **WHEN** a feed package requires a plugin, content API, or Zotero version that
  the current runtime does not satisfy
- **THEN** the plugin SHALL report the incompatible requirement
- **AND** it SHALL not download or install the package.

#### Scenario: Feed-directed rollback is allowed

- **WHEN** the feed points to a package whose version is lower than the
  installed package
- **AND** the artifact digest and compatibility constraints are valid
- **THEN** the installer SHALL allow the replacement.

#### Scenario: Rollback target is controlled by the feed

- **WHEN** a user wants to roll back the official Workflow package
- **THEN** the plugin SHALL install only the package currently selected by the
  chosen channel feed
- **AND** it SHALL NOT expose arbitrary URL, revision, or local-history rollback
  targets in the preferences UI.

#### Scenario: Content package 0.7.4 supports Zotero 10

- **WHEN** stable or beta selects official Content Package 0.7.4
- **THEN** the package SHALL require plugin `>=0.8.0`, content API `^3.0.0`, and Zotero `>=7 <11`
- **AND** Zotero 10 SHALL be allowed to install the package
- **AND** Zotero 11 and later SHALL be rejected by the compatibility check.
