## ADDED Requirements

### Requirement: Startup CLI Install State Detection

The plugin SHALL detect the user-level Host Bridge CLI install target on startup and classify it as `missing`, `stale`, `current`, or `unavailable`.

#### Scenario: Target is missing

- **WHEN** the bundled current-platform CLI binary is available
- **AND** the prefs-managed install target does not exist
- **THEN** the startup check returns `missing`
- **AND** includes the install target path and bundled SHA-256

#### Scenario: Target is stale

- **WHEN** the prefs-managed install target exists
- **AND** its SHA-256 differs from the bundled CLI SHA-256
- **THEN** the startup check returns `stale`

#### Scenario: Target is current

- **WHEN** the prefs-managed install target exists
- **AND** its SHA-256 equals the bundled CLI SHA-256
- **THEN** the startup check returns `current`
- **AND** no install prompt is shown

### Requirement: Startup CLI Prompt Deduplicates Declines

The plugin SHALL prompt the user to install or upgrade the CLI only when the install target is `missing` or `stale`, and SHALL suppress repeat prompts for the same bundled CLI identity after the user declines.

#### Scenario: User declines prompt

- **WHEN** startup detects a missing or stale CLI target
- **AND** the user declines installation
- **THEN** the bundled CLI identity is persisted
- **AND** later startups with the same identity do not prompt again

#### Scenario: Bundled CLI identity changes

- **WHEN** a previous bundled CLI identity was declined
- **AND** the bundled CLI version or SHA-256 changes
- **THEN** startup may prompt again

### Requirement: Startup CLI Prompt Uses Managed Target Only

The startup CLI prompt SHALL evaluate only the prefs-managed CLI install target and SHALL NOT treat PATH-resolved external CLI binaries as managed install state.

#### Scenario: PATH binary is stale but managed target is current

- **WHEN** PATH contains an older `zotero-bridge`
- **AND** the prefs-managed install target matches the bundled CLI
- **THEN** startup does not prompt
