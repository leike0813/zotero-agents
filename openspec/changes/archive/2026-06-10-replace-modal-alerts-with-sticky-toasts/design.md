## Context

Workflow execution feedback is split between `ProgressWindow` toasts for start/per-job events and modal alert dialogs for completion summaries and several early trigger failures. The modal alert path uses the runtime window alert API when available, which blocks Zotero UI interaction until the user acknowledges the dialog.

The current `execution.feedback.showNotifications` switch already controls whether workflow reminders appear. This change keeps that contract but changes the enabled feedback surface to non-blocking sticky toasts.

## Goals / Non-Goals

**Goals:**
- Replace workflow execution modal alert feedback with non-blocking toast feedback.
- Make workflow execution toasts require an explicit user click to dismiss.
- Bound visible workflow execution toasts to at most 3 at a time.
- Keep localized workflow feedback text and runtime logging unchanged.
- Preserve `execution.feedback.showNotifications=false` suppression semantics.

**Non-Goals:**
- No change to workflow provider protocols, request/result payloads, or apply ordering.
- No new workflow manifest field.
- No broad replacement of unrelated admin/settings dialogs that intentionally ask for confirmation.
- No dependency installation or new UI framework.

## Decisions

### 1. Route workflow execution alerts through the toast feedback seam

Decision:
- Replace workflow execution use of modal alert feedback with a sticky toast variant in the existing workflow feedback seam.
- Keep call sites using the workflow feedback abstraction rather than directly depending on toolkit details.

Rationale:
- The blocking behavior is caused by the UI surface, not by apply sequencing.
- Centralizing the replacement avoids one-off fixes across preparation, finish summary, deferred completion, and menu trigger failure paths.

Alternatives considered:
- Suppress finish summaries entirely: rejected because users still need visible completion/failure feedback.
- Add a manifest option for modal vs toast: rejected because modal workflow execution feedback is the behavior being removed.

### 2. Use sticky toasts for workflow execution notifications

Decision:
- Workflow execution toasts do not auto-close.
- A user click closes the toast.

Rationale:
- Completion and failure feedback can contain counts or reasons that should remain available until noticed.
- Sticky toasts avoid the original blocking behavior while preserving user acknowledgement.

Alternatives considered:
- Keep auto-closing start and per-job toasts: rejected because mixed dismissal rules make total-count bounding harder to reason about and can still cause users to miss failure feedback.

### 3. Enforce a visible toast cap in the workflow feedback layer

Decision:
- The workflow feedback layer enforces a maximum of 3 simultaneously visible workflow execution toasts.
- When a fourth workflow execution toast is emitted, the oldest visible workflow execution toast is closed or otherwise removed before showing the new one.

Rationale:
- Sticky toasts need an upper bound to prevent UI clutter across repeated workflow runs.
- The feedback seam is the narrowest shared layer for workflow execution notifications.

Alternatives considered:
- Queue overflow toasts until users dismiss earlier ones: rejected because delayed workflow feedback can become stale and misleading.
- Only suppress new toasts when the cap is reached: rejected because latest completion/failure feedback is more relevant than older notices.

## Risks / Trade-offs

- [Toolkit close API differs across runtime versions] -> Use feature detection for close/remove APIs and keep failures isolated so notification rendering does not break workflow execution.
- [Existing tests expect transient close timers] -> Update tests to assert sticky options and bounded behavior instead of timer use.
- [Too many per-job sticky toasts in multi-input workflows] -> The visible cap keeps the UI bounded; runtime logs remain the complete audit trail.
- [Accidentally changing confirmation dialogs] -> Limit replacement to workflow execution feedback helpers and their direct workflow trigger call sites.

## Migration Plan

1. Add sticky/bounded toast behavior to the workflow execution feedback seam.
2. Replace workflow execution modal alert summary/failure routes with sticky toast routes.
3. Update tests for finish summary, trigger failures, notification suppression, and visible-count bounding.
4. Update workflow notification documentation to describe sticky non-blocking toasts.

Rollback:
- Restore modal alert routing in the workflow feedback seam and revert the sticky toast option/cap changes. Workflow manifest and backend data do not require migration.

## Open Questions

- None.
