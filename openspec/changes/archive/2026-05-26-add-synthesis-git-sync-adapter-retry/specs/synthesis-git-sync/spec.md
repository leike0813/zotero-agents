## ADDED Requirements

### Requirement: Git Sync can use a prefs-configured Git command adapter

Git Sync SHALL provide a production adapter that is enabled only by explicit prefs configuration.

#### Scenario: Git Sync prefs are incomplete

- **WHEN** Git Sync is not enabled or remote URL is empty
- **THEN** the default Synthesis service SHALL keep Git Sync disabled
- **AND** no git command SHALL be executed.

#### Scenario: Git Sync prefs are complete

- **WHEN** Git Sync is enabled and remote configuration is valid
- **THEN** the default Synthesis service SHALL configure a Git command adapter
- **AND** the adapter SHALL use plugin-safe subprocess APIs, not Node-only child process imports.

### Requirement: Git Sync token prefs are encrypted

Git Sync SHALL NOT persist remote tokens in plaintext prefs.

#### Scenario: Token is stored

- **WHEN** a Git Sync token is saved
- **THEN** prefs SHALL contain an encrypted token envelope and masked metadata
- **AND** prefs SHALL NOT contain the plaintext token.

#### Scenario: Token cannot be decrypted

- **WHEN** encrypted token prefs cannot be decrypted
- **THEN** Git Sync SHALL report a config diagnostic
- **AND** SHALL NOT enable the adapter through plaintext fallback.

### Requirement: Git Sync retries transient failures with backoff

Retryable Git Sync failures SHALL be eligible for automatic retry when auto retry is enabled.

#### Scenario: Retryable sync failure occurs

- **WHEN** a sync run fails with retryable adapter or transport failure
- **THEN** Git Sync state SHALL become `failed_retryable`
- **AND** state SHALL include retry attempt metadata and `next_retry_at`.

#### Scenario: Scheduled retry becomes due

- **WHEN** the retry delay elapses and Git Sync is not paused or conflict-blocked
- **THEN** Git Sync SHALL run one retry attempt automatically.

#### Scenario: User retries manually

- **WHEN** the user invokes manual retry
- **THEN** Git Sync SHALL run immediately
- **AND** scheduled retry metadata SHALL be cleared or reset for the new run.

### Requirement: Git Sync command diagnostics are sanitized

Git command diagnostics SHALL NOT expose credentials or sensitive filesystem details.

#### Scenario: Git command fails

- **WHEN** adapter diagnostics include remote URLs, tokens, Authorization headers, stdout, or stderr
- **THEN** Git Sync SHALL store only sanitized diagnostic text.
