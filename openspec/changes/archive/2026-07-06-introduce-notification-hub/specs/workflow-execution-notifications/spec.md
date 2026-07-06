## ADDED Requirements

### Requirement: Workflow short feedback emits through Notification Hub

Workflow short feedback SHALL append a Notification Hub event before visible toast delivery.

#### Scenario: Visible workflow toast

- **WHEN** workflow feedback displays a short toast
- **THEN** the same lifecycle notification SHALL also be retained by the Notification Hub.

### Requirement: Workflow notification visibility does not remove observability

When `execution.feedback.showNotifications=false`, workflow short feedback SHALL suppress visible toast display only; the lifecycle notification SHALL remain available through Notification Hub consumers.

#### Scenario: Workflow notification display disabled

- **WHEN** workflow execution reaches a short-feedback lifecycle transition while visible workflow notifications are disabled
- **THEN** no visible Zotero toast SHALL be shown
- **AND** the Notification Hub SHALL retain the lifecycle event.

### Requirement: Workflow lifecycle transition has one visible toast owner

The same user-visible workflow lifecycle transition SHALL produce at most one visible short toast across owners.

#### Scenario: Duplicate owner transition

- **WHEN** two owners emit short notifications for the same display group inside the suppression window
- **THEN** only one visible toast SHALL be shown
- **AND** suppressed duplicate events SHALL remain marked in the Hub for diagnostics.
