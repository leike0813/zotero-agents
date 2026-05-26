## ADDED Requirements

### Requirement: Synthesis sync recovery treats canonical files as source of truth

Synthesis sync recovery SHALL keep Zotero mirror recovery separate from Git Sync and SHALL NOT use mirror shards as the Git remote synchronization mechanism.

#### Scenario: Git Sync is disabled

- **WHEN** Git Sync has no configured adapter or remote
- **THEN** Zotero mirror recovery SHALL continue to provide its existing local recovery behavior
- **AND** mirror recovery SHALL NOT require Git Sync state.

#### Scenario: Git Sync conflict exists

- **WHEN** Git Sync is blocked by a remote conflict
- **THEN** Zotero mirror recovery SHALL NOT automatically resolve or import the conflicted Git worktree content.
