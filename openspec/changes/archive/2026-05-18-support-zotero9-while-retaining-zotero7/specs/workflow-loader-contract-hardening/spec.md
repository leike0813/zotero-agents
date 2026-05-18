# workflow-loader-contract-hardening

## MODIFIED Requirements

### Requirement: Loader outputs SHALL be deterministic for diagnostics and tests

Warnings/errors, loaded entries, and startup-adjacent workflow diagnostics MUST
be emitted in deterministic order and include enough context to distinguish
loader failures from packaged built-in sync failures.

#### Scenario: Debug probe reports workflow source counts

- **WHEN** a workflow debug probe runs after startup
- **THEN** it SHALL report builtin workflow count and user workflow count
- **AND** it SHALL include latest built-in sync status when available.

#### Scenario: Empty workflow list preserves cause

- **WHEN** no workflows are loaded because built-in sync failed
- **THEN** diagnostics SHALL include the built-in sync failure details
- **AND** the user-facing debug path SHALL not require inspecting console logs
  alone.
