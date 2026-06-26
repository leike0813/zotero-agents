## MODIFIED Requirements

### Requirement: ACP agent runs receive a Host Bridge CLI injection bundle

ACP run Host Bridge CLI injection SHALL use shared platform path and environment
services for shim materialization and PATH injection.

#### Scenario: Windows ACP run receives CLI shims

- **WHEN** the plugin materializes Host Bridge CLI shims for a Windows ACP run
- **THEN** `zotero-bridge.cmd`, the extensionless shim, PATH entries, and
  profile paths SHALL keep the existing Windows-compatible behavior.

#### Scenario: POSIX ACP run receives CLI shims

- **WHEN** the plugin materializes Host Bridge CLI shims for Linux or macOS
- **THEN** PATH entries SHALL use POSIX delimiters
- **AND** the extensionless shim SHALL target the resolved bundled or installed
  CLI binary.
