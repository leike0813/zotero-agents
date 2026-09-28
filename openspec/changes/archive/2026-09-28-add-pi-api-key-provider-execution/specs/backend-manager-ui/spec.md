# Spec Delta

## ADDED Requirements

### Requirement: Built-in Agent page manages API keys without exposing plaintext

The Built-in Agent page SHALL allow setting, replacing, selecting, and clearing labeled API-key credentials independently of Backend Profiles. Plaintext SHALL appear only in the submitted credential action and encrypted store write, never in snapshots, saved drafts, logs, or result messages.

#### Scenario: User saves and clears a key
- **WHEN** a user saves an API key and later clears it
- **THEN** the page shows only redacted metadata and existing Backend Profile rows remain unchanged

### Requirement: Connection tests run only on explicit request

The Built-in Agent page SHALL run a Provider connection test only after a user action, correlate its response to that request, and show only redacted availability or failure state without changing defaults.

#### Scenario: User tests a configured Provider
- **WHEN** the user requests a connection test for the selected configuration
- **THEN** only that selected configuration is probed and the result contains no credential or Provider response body
