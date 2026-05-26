## ADDED Requirements

### Requirement: Git Sync credentials are not stored in remote URLs

Synthesis Git Sync SHALL reject credential-bearing remote URLs before enabling the Git command adapter.

#### Scenario: Remote URL embeds credentials

- **WHEN** the prefs remote URL contains userinfo or credential query parameters
- **THEN** Git Sync SHALL report a configuration diagnostic
- **AND** it SHALL NOT write the remote URL to the sync worktree Git config.

#### Scenario: Token is configured separately

- **WHEN** a token is required
- **THEN** it SHALL be read only from encrypted prefs
- **AND** diagnostics, state, UI snapshots, and receipts SHALL NOT expose the token.
