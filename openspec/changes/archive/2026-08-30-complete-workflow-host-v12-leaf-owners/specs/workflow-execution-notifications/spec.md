## ADDED Requirements

### Requirement: Workflow callable toasts SHALL be validated and caller-scoped
The workflow notification adapter SHALL accept only non-empty text of at most 4,096 UTF-16 code units and the closed toast types `default`, `success`, and `error`, defaulting to `default`. Delivery SHALL be fire-and-forget through the existing notification owner, MUST NOT return a UI handle, and MUST limit one caller scope to five simultaneously visible callable toasts without evicting another caller's toast.

#### Scenario: Workflow emits a valid toast
- **WHEN** an interactive workflow submits a valid toast request
- **THEN** the notification owner displays it without blocking execution or returning a native handle
- **AND** existing Notification Hub observability remains intact

#### Scenario: Caller exceeds its visible limit
- **WHEN** one workflow caller already owns five visible callable toasts
- **THEN** another callable toast from that scope fails with `resource_limited`
- **AND** no toast belonging to another caller is replaced

#### Scenario: Non-interactive workflow emits a toast
- **WHEN** a callable toast is requested through the non-interactive adapter
- **THEN** visible delivery fails with `interaction_required`
- **AND** the diagnostic is recorded through logging without creating local UI

