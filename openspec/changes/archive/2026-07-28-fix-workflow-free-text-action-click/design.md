## Context

The submit dialog and Dashboard workflow-options page exchange draft updates
with TypeScript hosts that can rebuild their rendered forms. A text input
commits on blur, which occurs before a clicked action button receives its click
event. Treating every draft update as structural could therefore replace the
clicked button before its action ran.

## Goals / Non-Goals

**Goals:**

- Preserve the first action following a free-text, numeric, or array edit.
- Keep necessary structural refreshes for backend and recommendation choices.
- Apply one refresh policy across the submit dialog and Dashboard.

**Non-Goals:**

- Change persisted workflow-settings data or provider request contracts.
- Suppress validation or stop structural refreshes caused by explicit choices.
- Alter the legacy native dialog, which collects live DOM values on submission.

## Decisions

- Carry a draft-change origin (`text` or `choice`) in internal UI messages.
  The origin describes the interaction that caused a commit without changing
  the field value contract.
- Centralize structural-refresh eligibility in the workflow settings dialog
  model. Text-originated changes update the host draft but cannot rebuild the
  form; choice-originated backend and dependent provider-option changes retain
  their existing refresh behavior.
- Keep the existing blur/change commit model. Moving commits to every input
  event would introduce unnecessary persistence and refresh traffic, while
  preventing button focus changes would make the behavior control-specific.

## Risks / Trade-offs

- [A text edit can leave dependent options visually stale until an explicit
  choice refresh] → Text edits keep their draft value and the confirmed submit
  payload remains authoritative; recommendation and backend choices still
  refresh immediately.
- [Older internal messages omit an origin] → Normalize missing or unknown
  origins as `choice` to retain the previous structural-refresh behavior.
