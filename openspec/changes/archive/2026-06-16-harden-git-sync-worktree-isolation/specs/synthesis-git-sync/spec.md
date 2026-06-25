## ADDED Requirements

### Requirement: Git Sync worktree is isolated from existing repositories

Git Sync SHALL only run Git commands inside a plugin-managed worktree protected by a sentinel file.

#### Scenario: Worktree is inside an existing repository

- **WHEN** the configured worktree path resolves inside a parent Git repository that is not the Git Sync worktree itself
- **THEN** Git Sync SHALL fail before `git init`, `remote remove`, `remote add`, `commit`, or `push`
- **AND** diagnostics SHALL include `git_sync_worktree_unsafe_parent_repo`.

#### Scenario: Existing repository lacks sentinel

- **WHEN** the worktree path itself is already a Git repository but lacks the Git Sync sentinel
- **THEN** Git Sync SHALL fail before rewriting remotes
- **AND** diagnostics SHALL include `git_sync_worktree_sentinel_missing`.

#### Scenario: Existing sentinel does not match config

- **WHEN** the Git Sync sentinel remote, branch, or source marker differs from current configuration
- **THEN** Git Sync SHALL fail before rewriting remotes
- **AND** diagnostics SHALL include `git_sync_worktree_sentinel_mismatch`.

#### Scenario: Managed worktree is valid

- **WHEN** the worktree is outside other Git repositories and the sentinel is absent or matches
- **THEN** Git Sync MAY write or refresh the sentinel, initialize the repo, configure `origin`, and sync.

### Requirement: Direct launcher provides safe runtime root

Development direct launches SHALL avoid falling back to the project repository as the runtime root.

#### Scenario: Direct launch has no runtime root override

- **WHEN** `start:direct` launches Zotero without `ZOTERO_SKILLS_RUNTIME_ROOT`
- **THEN** the launcher SHALL pass a project-external runtime root to the Zotero process.
