## ADDED Requirements

### Requirement: Profile identity SHALL route resident state

The Librarian SHALL select one connection profile in this order: service `--profile`, `ZOTERO_BRIDGE_PROFILE`, then the platform well-known profile. The well-known profile SHALL use the existing default workspace. An explicit profile SHALL be identified by its expanded, absolute, normalized, platform-case-normalized path and a SHA-256 digest of that identity; profile file contents, tokens, endpoints, and other secrets SHALL not affect the digest.

#### Scenario: Explicit profiles are isolated

- **WHEN** two normalized explicit profile paths are used
- **THEN** their workspaces SHALL be distinct directories under `<base>/workspaces/<sha256>/`
- **AND** SQLite state, workflow catalog, watched runs, notifications, and local CLI installation SHALL remain profile-local.

#### Scenario: Existing default state remains owned by the default profile

- **WHEN** no explicit profile is selected
- **THEN** the service SHALL use `<base>/state.sqlite`
- **AND** existing state SHALL remain readable without migration or copying.

### Requirement: Workspace resolution SHALL fail closed

An explicit profile that does not exist, cannot be normalized, or resolves to an unusable workspace root SHALL return a structured error and SHALL NOT fall back to a shared workspace. A `--db` path SHALL be accepted only when it resolves inside the selected workspace; otherwise the operation SHALL return `workspace_path_outside_profile` before creating a database or parent directory.

#### Scenario: Database escape is rejected

- **WHEN** `--db` points outside the selected workspace
- **THEN** the service SHALL emit a failed operation receipt with `workspace_path_outside_profile`
- **AND** SHALL not create the database file.

### Requirement: One service process SHALL use one resolved workspace

The service SHALL resolve its workspace once at process startup and SHALL use the resulting database for every operation in that process. Explicit profile identity SHALL be passed to each `zotero-bridge` invocation so the resident connection and workspace identity cannot diverge.

#### Scenario: Bridge receives explicit profile

- **WHEN** an operation invokes `zotero-bridge` under an explicit profile
- **THEN** the invocation SHALL include that profile path in the CLI profile option or equivalent environment contract.
