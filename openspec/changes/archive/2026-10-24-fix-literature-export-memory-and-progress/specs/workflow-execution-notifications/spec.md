## ADDED Requirements

### Requirement: Progress toast controllers SHALL belong to their caller scope
Progress toasts SHALL accept non-empty text up to 4,096 UTF-16 code units and optional finite progress from 0 to 100. Updates SHALL reuse the same window and coalesce within 100 ms. Callable toast limits SHALL apply without evicting another caller's notification. Progress observations SHALL NOT produce a new Notification Hub event for every update.

#### Scenario: Workflow updates a long operation
- **WHEN** a workflow repeatedly updates its progress controller
- **THEN** one window displays the latest text and actual progress.

#### Scenario: Caller reaches its notification limit
- **WHEN** another progress toast would exceed the caller's five visible callable notifications
- **THEN** creation fails with `resource_limited` without closing another caller's window.

### Requirement: Dismissing progress SHALL not cancel execution
Dismissal, explicit close, scope disposal, window teardown and plugin shutdown SHALL release owned windows, timers and references idempotently. Later updates SHALL not reopen a dismissed window. Completion and failure feedback SHALL remain owned by workflow settlement.

#### Scenario: User dismisses a progress toast
- **WHEN** the user closes the progress notification
- **THEN** workflow execution continues and later updates do not recreate the window.

#### Scenario: Scope ends exceptionally
- **WHEN** the owning hook throws or its scope is disposed
- **THEN** all its progress controllers close without affecting another scope.
