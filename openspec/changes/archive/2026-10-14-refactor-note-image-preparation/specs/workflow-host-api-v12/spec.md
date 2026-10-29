# Spec Delta

## ADDED Requirements

### Requirement: Image preparation SHALL be independent of UI windows

Image preparation SHALL decode, resize, and encode without depending on the existence or lifetime of preferences, dialogs, or main windows. The existing request/result DTO, opaque run-scoped refs, input/output/scope byte limits, and preserve-source-bytes behavior SHALL remain supported.

#### Scenario: Preferences window is closed
- **WHEN** a workflow prepares a valid image after opening and closing preferences
- **THEN** preparation completes using the same policy as a run that never opened preferences
- **AND** the image remains usable by the existing note mutation owner.

### Requirement: Image preparation SHALL have an owned bounded lifetime

Each image preparation SHALL have one 30-second total budget from input reading through result registration. Caller cancellation, scope disposal, and plugin shutdown SHALL end pending calls and release processing resources. No late completion SHALL register or return a prepared ref. Omitted control SHALL inherit hook control; explicit control SHALL retain its existing precedence.

#### Scenario: Processing does not respond
- **WHEN** the total preparation budget expires
- **THEN** the call fails with resource_limited and resource duration_ms
- **AND** its processing resources and listeners are released.

#### Scenario: Scope ends during preparation
- **WHEN** a scope is disposed while a read or conversion is pending
- **THEN** the pending call fails as canceled
- **AND** a late response cannot recreate prepared content in that scope.

#### Scenario: Concurrent preparations complete
- **WHEN** concurrent preparations would exceed the scope byte limit together
- **THEN** only results within the limit are registered
- **AND** excess results fail with resource_limited.
