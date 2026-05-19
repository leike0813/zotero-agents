# acp-skillrunner-compatible-runner

## ADDED Requirements

### Requirement: ACP Skills selected composer is isolated from other run updates

ACP Skills SHALL preserve the selected run's active composer while unrelated
runs stream, reconnect, or refresh.

#### Scenario: Other run streams while selected run is waiting

- **WHEN** the selected ACP Skills run is waiting for user open-text input
- **AND** another run receives streaming output or status updates
- **THEN** the selected run's textarea SHALL remain the same DOM node
- **AND** its draft, focus, selection, and enabled state SHALL be preserved.

#### Scenario: Terminal run with reply availability remains usable

- **WHEN** a failed, canceled, or completed run still has an available
  conversation reply path
- **THEN** reconnect or snapshot refresh SHALL NOT force the composer into a
  disabled completed-only state.

### Requirement: ACP Skills refresh hardening preserves prompt semantics

ACP Skills SHALL preserve existing prompt interaction semantics while hardening
refresh behavior.

#### Scenario: Choice and permission prompts stay button-first

- **WHEN** a selected run has choice options or a permission request
- **THEN** the corresponding buttons SHALL remain operable after snapshot
  refresh
- **AND** text input SHALL NOT become the only available reply path.
