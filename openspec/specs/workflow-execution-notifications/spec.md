# workflow-execution-notifications Specification

## Purpose
TBD - created by archiving change enhance-workflow-notifications-i18n-toasts. Update Purpose after archive.
## Requirements
### Requirement: Workflow Execution Summary Dialog SHALL Support Localization

Workflow execution reminders (start toast, per-job toasts, final summary toast) SHALL be localizable and SHALL be shown only when the workflow execution feedback config enables reminders.

#### Scenario: Localized reminders on execution when enabled
- **WHEN** a workflow trigger runs and `execution.feedback.showNotifications` is omitted or `true`
- **THEN** runtime SHALL emit localized start and per-job toasts
- **AND** final summary toast SHALL use locale-specific text
- **AND** final summary toast SHALL include succeeded/failed counts
- **AND** final summary toast SHALL include skipped count when skipped units exist
- **AND** runtime SHALL NOT open a final summary modal alert dialog

#### Scenario: Execution reminders are suppressed when disabled
- **WHEN** a workflow trigger runs and `execution.feedback.showNotifications` is `false`
- **THEN** runtime SHALL NOT emit start toast
- **AND** runtime SHALL NOT emit per-job toasts
- **AND** runtime SHALL NOT emit the final summary toast
- **AND** runtime SHALL NOT open the final summary alert dialog
- **AND** workflow execution result logging SHALL remain available
### Requirement: Workflow Trigger SHALL Emit Start Toast

The system SHALL show one sticky toast when a workflow trigger starts execution.

#### Scenario: Trigger start toast
- **WHEN** execution requests are resolved and trigger starts running
- **THEN** exactly one start toast SHALL be shown for this trigger
- **AND** the start toast SHALL remain visible until dismissed by the user
### Requirement: Each Job Completion SHALL Emit Per-Job Toast

The system SHALL show one sticky toast per job completion with success or failure status.

#### Scenario: Job success toast
- **WHEN** a job finishes successfully
- **THEN** one success toast SHALL be shown for that job
- **AND** the success toast SHALL remain visible until dismissed by the user

#### Scenario: Job failure toast
- **WHEN** a job finishes with failure (provider/applyResult/record issues)
- **THEN** one failure toast SHALL be shown for that job
- **AND** the failure toast SHALL remain visible until dismissed by the user
### Requirement: Template Example Reminder Registration SHALL Be Removed

Template example reminder behaviors SHALL NOT be registered during plugin startup.

#### Scenario: No example shortcut reminder on startup
- **WHEN** plugin starts and initializes runtime hooks
- **THEN** template example shortcut reminder (e.g. "Example Shortcuts") SHALL NOT be shown
- **AND** core workflow menu/execution capabilities SHALL remain available
### Requirement: Workflow Execution Toasts SHALL Be Non-Blocking Sticky Feedback

Workflow execution notification feedback SHALL use non-modal toasts that do not block Zotero UI interaction and remain visible until dismissed by the user.

#### Scenario: Workflow notification does not block next workflow action
- **WHEN** a workflow execution notification is emitted for start, job completion, skipped/no-input, trigger failure, or final summary feedback
- **THEN** runtime SHALL NOT open a modal alert dialog for that notification
- **AND** runtime SHALL return control to the Zotero UI without waiting for user acknowledgement
- **AND** the notification SHALL remain visible until the user dismisses it

#### Scenario: Workflow notifications are bounded
- **WHEN** workflow execution notification toasts are enabled
- **AND** more than 3 workflow execution notification toasts would be visible at the same time
- **THEN** runtime SHALL keep no more than 3 workflow execution notification toasts visible
- **AND** runtime SHALL prefer retaining the newest workflow execution notification toasts
