# synthesis-workbench-ui Delta

## MODIFIED Requirements

### Requirement: Workbench surfaces durable Git Sync status

Synthesis Workbench SHALL keep Git Sync service state internal and hidden from user-facing Home sync controls.

#### Scenario: Git Sync state exists in a snapshot

- **WHEN** the Home surface renders a snapshot that includes `sync.git`
- **THEN** it SHALL NOT show Git Sync cards, Git Sync actions, remote URL, branch, token state, or Git conflict controls.

### Requirement: Workbench presents Git Sync config and runtime status

Git Sync configuration and runtime status SHALL NOT be exposed in user-facing Workbench Home UI.

#### Scenario: Git Sync is not configured

- **WHEN** Git Sync has no enabled prefs-backed adapter
- **THEN** Workbench SHALL NOT show a Git Sync setup prompt.

#### Scenario: Git Sync is configured

- **WHEN** Git Sync configuration is complete
- **THEN** Workbench SHALL NOT offer Git Sync runtime actions from Home.

### Requirement: Workbench presents semantic conflict approvals

Workbench SHALL present semantic conflict approvals for the visible sync transport only.

#### Scenario: WebDAV conflict is blocked

- **WHEN** WebDAV Sync state is `blocked_conflict`
- **THEN** Workbench SHALL show the conflict asset path, reason, and available hashes
- **AND** it SHALL offer supported conflict actions from the WebDAV Sync state.

## ADDED Requirements

### Requirement: Workbench consolidates visible sync feedback

Synthesis Home SHALL present WebDAV Sync status, actions, diagnostics, and execution feedback in one Sync section.

#### Scenario: Sync action feedback is available

- **WHEN** a WebDAV Sync command is in flight, completed, failed, or has diagnostics
- **THEN** the Home Sync section SHALL render a terminal-style feedback area with compact log lines.

#### Scenario: Home insights render

- **WHEN** Synthesis Home renders Library Insights
- **THEN** it SHALL NOT render a separate Sync insight card outside the Sync section.

#### Scenario: Home shows review item count

- **WHEN** the Home Library Insights section is rendered
- **THEN** it SHALL show a Review items card using snapshot review summary data
- **AND** the count SHALL NOT require opening the Review tab first.

#### Scenario: Sync section is compact

- **WHEN** the Home Sync section is rendered
- **THEN** it SHALL use a compact WebDAV summary row rather than insight cards.
