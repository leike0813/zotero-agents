## ADDED Requirements

### Requirement: ACP Chat SHALL bind Host Bridge scope to the adapter environment

Each ACP Chat adapter SHALL receive a `ZOTERO_BRIDGE_SCOPE` containing its own conversation ID, and the shared ACP Chat profile SHALL NOT contain conversation-specific scope.

#### Scenario: A second conversation connects

- **GIVEN** conversation A and conversation B use the same ACP Chat workspace and Host Bridge profile
- **WHEN** conversation B connects after conversation A
- **THEN** each adapter environment SHALL retain its own conversation scope
- **AND** a Host Bridge write from conversation A SHALL route only to conversation A.

### Requirement: ACP Chat SHALL serialize pending permission requests

ACP Chat SHALL retain pending permission requests per conversation in arrival order, expose only the active head request, and settle every queued resolver exactly once.

#### Scenario: Two requests overlap

- **WHEN** a conversation receives a second permission request before the first is resolved
- **THEN** the first request SHALL remain visible
- **AND** resolving it SHALL promote the second request without losing either resolver.

#### Scenario: A stale permission action arrives

- **WHEN** an action names a request ID other than the active request
- **THEN** ACP Chat SHALL NOT resolve or remove the active request.

#### Scenario: The conversation terminates with queued requests

- **WHEN** a conversation is cancelled, disconnected, or otherwise terminated with unresolved permission requests
- **THEN** ACP Chat SHALL settle every unresolved request as cancelled
- **AND** SHALL publish an empty permission state.
