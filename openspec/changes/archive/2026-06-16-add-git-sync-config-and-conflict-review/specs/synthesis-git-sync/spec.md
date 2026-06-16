## ADDED Requirements

### Requirement: Git Sync configuration is preference-backed

Git Sync SHALL store its enabled flag, remote URL, branch, and auto-retry flag in Zotero preferences.

Git Sync SHALL detect the Git executable automatically and SHALL NOT require users to configure a Git command.

#### Scenario: Preferences are incomplete

- **WHEN** Git Sync is disabled or the remote URL is empty
- **THEN** the production Git Sync adapter SHALL remain disabled
- **AND** Workbench SHALL offer preferences as the configuration path.

#### Scenario: Remote URL contains credentials

- **WHEN** a user saves or tests a remote URL containing credentials, tokens, passwords, or secret query parameters
- **THEN** Git Sync SHALL reject the configuration
- **AND** diagnostics SHALL be sanitized.

### Requirement: Git Sync token is encrypted in preferences

Git Sync SHALL store access tokens only through the encrypted token preference envelope.

#### Scenario: Token is saved

- **WHEN** a user enters a token in preferences
- **THEN** the plaintext token SHALL NOT be persisted
- **AND** preferences SHALL show only a masked token and timestamp.

#### Scenario: Token is cleared

- **WHEN** the user clears the token
- **THEN** encrypted token, masked token, and token timestamp prefs SHALL be empty.

### Requirement: Git Sync connection test is non-mutating

Git Sync SHALL provide a preferences connection test that does not write the sync worktree.

#### Scenario: User tests configuration

- **WHEN** the user runs the Git Sync connection test
- **THEN** Git Sync SHALL validate prefs, token decryptability, Git executable availability, and remote reachability
- **AND** it SHALL NOT initialize, fetch into, commit, or push the sync worktree.

#### Scenario: Remote branch is missing but remote is reachable

- **WHEN** the connection test runs `git ls-remote --heads <remote> <branch>`
- **AND** Git exits successfully with no matching head in stdout
- **THEN** the result SHALL be successful
- **AND** it SHALL report `remote_branch_state` as `missing_initializable`
- **AND** it SHALL include the info diagnostic `git_sync_remote_branch_missing_initializable`.

#### Scenario: Remote cannot be reached

- **WHEN** the connection test runs `git ls-remote --heads <remote> <branch>`
- **AND** Git exits with a non-zero status
- **THEN** the result SHALL fail with sanitized diagnostics
- **AND** it SHALL NOT report the branch as initializable.

#### Scenario: Git executable is missing

- **WHEN** Git Sync cannot detect Git
- **THEN** the connection test SHALL fail with sanitized diagnostics
- **AND** diagnostics SHALL include bounded executable-resolution details such as checked paths.

### Requirement: Git Sync initializes empty remotes on first sync

Git Sync SHALL treat an empty remote repository or missing configured branch as a normal first-sync state.

#### Scenario: Fetch reports missing remote ref

- **WHEN** Git Sync runs `fetch origin <branch>`
- **AND** Git reports that the remote ref cannot be found
- **THEN** Git Sync SHALL record `git_sync_remote_branch_missing_initializable`
- **AND** it SHALL skip `merge origin/<branch>`
- **AND** it SHALL continue to commit and `push origin HEAD:<branch>`.

#### Scenario: Fetch fails for auth or network reasons

- **WHEN** Git Sync runs `fetch origin <branch>`
- **AND** Git exits non-zero for a reason other than missing remote ref
- **THEN** Git Sync SHALL fail the run
- **AND** it SHALL NOT treat the remote branch as initializable.

### Requirement: Git Sync conflict approvals use semantic actions

Git Sync SHALL expose conflict approval actions as `keep_local`, `use_remote`, `save_remote_copy`, `mark_needs_attention`, and `clear_after_manual_edit`.

#### Scenario: User keeps local

- **WHEN** `keep_local` is approved
- **THEN** Git Sync SHALL close the conflict gate, keep local SQLite and artifacts unchanged, and queue export.

#### Scenario: User saves remote copy

- **WHEN** `save_remote_copy` is approved
- **THEN** Git Sync SHALL copy remote conflict assets into local conflict-review storage
- **AND** it SHALL remain `blocked_conflict`.

#### Scenario: User clears after manual edit

- **WHEN** `clear_after_manual_edit` is approved
- **THEN** Git Sync SHALL rerun validation and durable preview
- **AND** it SHALL clear the blocker only if no conflict remains.

#### Scenario: Unsafe remote apply is requested

- **WHEN** `use_remote` cannot be proven safe for a single entity and matching hash
- **THEN** Git Sync SHALL reject the action with diagnostics
- **AND** it SHALL remain `blocked_conflict`.
