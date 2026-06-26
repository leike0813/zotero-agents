## MODIFIED Requirements

### Requirement: Runtime platform services own platform-sensitive primitives
The system SHALL provide a shared platform services layer for runtime platform
detection, native path handling, environment/PATH handling, command resolution,
and subprocess execution.

#### Scenario: Business module needs a native runtime path
- **WHEN** plugin code joins runtime-managed path segments
- **THEN** it SHALL call the shared platform path service or a facade backed by
  that service
- **AND** it SHALL NOT implement new ad hoc path separator logic.

#### Scenario: Business module needs to launch a command
- **WHEN** plugin code launches ACP, Host Bridge, SkillRunner, Git, uv, npm, or
  npx commands
- **THEN** it SHALL resolve and launch the command through the shared platform
  command/subprocess services
- **AND** it SHALL NOT implement a separate PATH search fallback.

#### Scenario: Startup command registry is initialized
- **WHEN** the plugin starts
- **THEN** the platform layer SHALL preflight `uv`, Python, `node`, `npm`, and
  `npx` command availability once
- **AND** it SHALL store the result in memory for the current plugin lifecycle
- **AND** missing commands SHALL NOT abort plugin startup.

#### Scenario: Startup registry is reused
- **GIVEN** a startup command registry has been initialized
- **WHEN** ACP launch or ACP Skills runtime dependency handling needs a known
  runtime command
- **THEN** it SHALL reuse the startup registry result for that command
- **AND** it SHALL NOT re-run executable discovery for that known command during
  each job.

### Requirement: Windows runtime behavior remains a golden baseline
The platform services SHALL preserve current Windows runtime behavior while
adding Linux and macOS fixes.

#### Scenario: Windows path is joined from an explicit root
- **GIVEN** a root path such as `D:\ZoteroData` or `D:/ZoteroData`
- **WHEN** plugin code joins managed child segments under it
- **THEN** the resulting path SHALL remain Windows-shaped.

#### Scenario: Windows command is resolved
- **WHEN** plugin code resolves `npx`, `npm`, `node`, `uv`, PowerShell, or cmd
  on Windows
- **THEN** existing `.cmd`, `.bat`, `.exe`, PowerShell, cmd, and PATH case
  behavior SHALL remain supported.

### Requirement: Non-interactive Linux/macOS command lookup is explicit
The platform services SHALL account for GUI-launched Zotero processes that do
not inherit a login shell PATH.

#### Scenario: ACP backend command is not in inherited PATH
- **WHEN** an ACP backend command such as `npx` is not found in the inherited
  runtime PATH on Linux or macOS
- **THEN** command resolution SHALL check documented non-interactive candidate
  locations
- **AND** failure diagnostics SHALL include the command and checked paths.
