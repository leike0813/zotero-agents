## ADDED Requirements

### Requirement: Archive creation SHALL use asynchronous native Zotero IO
In Zotero, archive creation SHALL use the available native ZIP writer without collecting the complete archive in JavaScript memory. Missing native support SHALL report `unavailable`. Publication SHALL occur only after writing, integrity validation and cancellation checks succeed.

#### Scenario: Native writer is available
- **WHEN** Zotero exposes its native ZIP writer
- **THEN** archive creation uses it asynchronously and reports completed entries
- **AND** the UI remains responsive during compression.

#### Scenario: Write is unsuccessful
- **WHEN** writing fails, source integrity changes, or the call is canceled
- **THEN** the existing destination remains unchanged and owned temporary files are removed after in-flight IO settles.

### Requirement: Workflow call progress SHALL be observational
`WorkflowCallControl` SHALL accept optional `onProgress` observations containing phase, completed work, optional total and unit. Materialization and archive operations SHALL report actual completed work. Observer failures SHALL NOT change the business result or replace cancellation semantics.

#### Scenario: Observer fails
- **WHEN** a progress callback throws
- **THEN** the operation continues with its original result and cancellation control.

### Requirement: Host SHALL expose scoped progress notifications
The exact v12 projection SHALL add `notifications.createProgress` alongside the unchanged fire-and-forget `notifications.toast`. The new member SHALL return only `update` and `close` operations, without native UI objects. Interactive and non-interactive surfaces SHALL retain the same member shape.

#### Scenario: Non-interactive caller requests progress UI
- **WHEN** a non-interactive caller invokes `notifications.createProgress`
- **THEN** it receives `interaction_required` without opening local UI.
