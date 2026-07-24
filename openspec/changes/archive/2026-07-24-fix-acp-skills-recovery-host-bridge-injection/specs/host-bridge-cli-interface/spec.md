## ADDED Requirements

### Requirement: Run-scoped Host Bridge CLI shims SHALL be directly executable on POSIX

When the plugin materializes run-scoped Host Bridge CLI access for an available CLI, it SHALL write a POSIX shell shim with executable permission through the runtime filesystem abstraction. The injected PATH SHALL retain both the shim directory and the resolved CLI directory.

#### Scenario: POSIX shell shim is executable

- **GIVEN** a Host Bridge CLI binary is available on a POSIX platform
- **WHEN** the plugin materializes run-scoped CLI access
- **THEN** the generated `zotero-bridge` shell shim SHALL be executable by its owner
- **AND** invoking the shim SHALL delegate to the resolved CLI binary.

#### Scenario: PATH retains the resolved CLI fallback

- **WHEN** run-scoped Host Bridge CLI access is available
- **THEN** the injected PATH SHALL place the shim directory before the resolved CLI directory
- **AND** the resolved CLI directory SHALL remain available if the shell does not execute the shim.

#### Scenario: Windows command shim is unchanged

- **GIVEN** run-scoped CLI access is materialized on Windows
- **WHEN** the plugin writes the command shims
- **THEN** it SHALL continue to write the `.cmd` shim
- **AND** POSIX executable-permission handling SHALL NOT be required for that file.
