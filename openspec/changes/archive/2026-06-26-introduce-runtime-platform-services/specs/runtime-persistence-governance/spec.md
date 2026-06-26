## MODIFIED Requirements

### Requirement: Runtime persistence naming remains compatibility-safe

The system SHALL use platform services for current visible persistence root
defaults, managed child path construction, and runtime-root diagnostics while
continuing to recognize legacy `zotero-skills` locations during migration and
diagnostics.

#### Scenario: Explicit runtime root is Windows-shaped

- **GIVEN** the configured runtime root is a Windows absolute path
- **WHEN** runtime persistence paths are resolved
- **THEN** child paths SHALL preserve Windows path shape
- **AND** the path SHALL NOT be reinterpreted as a POSIX relative repository
  path.

#### Scenario: Explicit runtime root is POSIX-shaped

- **GIVEN** the configured runtime root is a POSIX absolute path
- **WHEN** runtime persistence paths are resolved
- **THEN** child paths SHALL preserve POSIX path shape.
