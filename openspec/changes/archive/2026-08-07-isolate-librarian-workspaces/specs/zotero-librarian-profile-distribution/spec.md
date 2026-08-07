## ADDED Requirements

### Requirement: Installer artifacts SHALL follow the selected workspace

The installer SHALL use the current profile workspace's `.zotero-bridge/bin` as the default install directory. The well-known profile MAY update the global well-known connection-profile link; an explicit profile SHALL never replace that link. `ZOTERO_BRIDGE_HOST_PROFILE` and `ZOTERO_BRIDGE_HOST_HOME` SHALL locate the Zotero-side profile only and SHALL not participate in resident workspace identity.

#### Scenario: Explicit install is local

- **WHEN** the installer runs with an explicit profile
- **THEN** the executable SHALL be installed under that profile workspace
- **AND** the global well-known link SHALL remain unchanged.

### Requirement: Distribution metadata SHALL declare workspace layout

The generated profile config and distribution metadata SHALL declare the active profile environment variable, workspace root, `connection-profile-v1` layout, and default well-known workspace. Generated `.gitignore` content SHALL ignore `workspaces/` and runtime artifacts.

#### Scenario: Cron follows profile state

- **WHEN** a cron command invokes the resident service
- **THEN** it SHALL inherit the active profile selection and resolve the same profile-local state and CLI path without a manually supplied workspace path.
