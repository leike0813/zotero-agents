## Why

Editing a free-text workflow option could cause its blur handler to refresh and
rebuild the form before the user's first button click was delivered. Users had
to click outside the field before confirming, refreshing, or selecting another
control.

## What Changes

- Classify workflow-settings draft updates by whether they came from editable
  text or an explicit choice control.
- Keep text-originated draft updates synchronized without rebuilding the
  current form; retain structural refreshes for backend and recommendation
  choices.
- Cover the submit dialog and Dashboard workflow-options page with the same
  refresh policy.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `workflow-settings-dialog-model-split`: preserve the first requested action
  after an editable workflow-settings field changes.

## Impact

- Affects the workflow submit dialog, Dashboard workflow-options UI, and their
  internal draft-update messages.
- No persisted settings schema, backend API, or workflow manifest change.
