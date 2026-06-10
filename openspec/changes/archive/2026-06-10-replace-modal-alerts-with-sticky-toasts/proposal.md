## Why

Workflow execution currently uses modal alert dialogs for completion and some trigger failure feedback. These dialogs block the Zotero UI until acknowledged, which prevents users from smoothly starting or applying another workflow after the previous workflow finishes.

## What Changes

- Replace workflow execution modal alert feedback with non-blocking toast feedback.
- Make workflow execution toasts sticky by default: they remain visible until the user clicks to close them.
- Limit the number of simultaneously visible workflow execution toasts to 3.
- Preserve `execution.feedback.showNotifications` as the workflow-level switch for execution reminders.
- Preserve runtime logging for workflow outcomes and failures.
- No breaking change to workflow manifest shape or provider protocols.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `workflow-execution-notifications`: workflow execution feedback changes from modal final summary dialogs to sticky, non-blocking toasts with a bounded visible count.

## Impact

- Affected code: workflow execution feedback emitters and call sites that currently route workflow execution completion or trigger failure feedback through modal alert helpers.
- Affected UI: workflow start, per-job, completion summary, skipped/no-input, and trigger failure notifications.
- Affected docs/specs: workflow execution notification contract and workflow authoring docs that describe `execution.feedback.showNotifications`.
- No dependency, backend API, or workflow manifest schema changes are expected.
