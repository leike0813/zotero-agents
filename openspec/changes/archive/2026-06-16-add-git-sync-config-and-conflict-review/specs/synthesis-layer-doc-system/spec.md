## ADDED Requirements

### Requirement: Synthesis docs describe Git Sync configuration and conflict approval

Active Synthesis docs SHALL document preferences-backed Git Sync configuration, encrypted token storage, non-mutating connection tests, empty-remote initialization, and semantic conflict approval actions.

#### Scenario: Developer reads Git Sync durable-state docs

- **WHEN** the docs discuss Git Sync operation
- **THEN** they SHALL identify Preferences as the durable configuration surface
- **AND** they SHALL state that Workbench only exposes runtime state and conflict approval actions
- **AND** they SHALL state that a missing remote branch is initialized on first sync rather than treated as a connection failure.
