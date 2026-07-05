## Context

ACP Skills has a stable panel publication model: the store emits typed run
changes, the workspace sidebar filters those changes against the currently
selected run, and `prepareAcpSkillRunPanelSnapshot()` reads the selected
read-model without refreshing runtime backends.

ACP Chat currently mixes backend refresh, frontend metadata notification,
conversation snapshot publication, and transcript hydration in the same
publication path. That is the source of the self-loop. Transport, persistence,
and renderer concerns are already close enough to ACP Skills; the missing piece
is a clean panel read-model boundary.

## Goals / Non-Goals

**Goals:**

- Make ordinary ACP Chat snapshot publication a no-refresh read.
- Publish ACP Chat panel snapshots through typed, filtered changes.
- Keep selected transcript page rendering compatible with the existing ACP Chat
  child contract.
- Ensure page request handling never refreshes backends.

**Non-Goals:**

- No ACP Chat write-side lifecycle rewrite.
- No new delivery model using `notifyFrontend: false`.
- No listener map keyed by item mode.
- No session index cache.

## Decisions

### Add a narrow read-model module

`prepareAcpChatPanelSnapshot()` lives outside `acpSessionManager.ts`. It calls
only existing read APIs:

- `getAcpConversationUiSnapshot(..., { itemMode: "structural" })`
- `getAcpFrontendSnapshot({ itemMode: "structural" })`
- `readAcpConversationTranscriptPage()`

The module also owns the ACP Chat transcript page key and page scope validation
so host code and child payloads share one rule.

### Keep page read failures non-fatal

If a selected page read fails, the read-model logs a warning and returns panel
chrome without `selectedTranscriptPage`. The child may show loading for the
transcript area, but backend/session selectors and status chrome must remain
renderable.

### Emit typed panel changes from existing boundaries

`acpSessionManager` keeps the existing frontend snapshot API intact and adds a
separate `subscribeAcpChatPanelSnapshots()` channel. Existing emit boundaries
translate to coarse change kinds: active scope, status, permission,
session-list, transcript-boundary, transcript-append, runtime-options, backend,
or global.

### Filter in the workspace host

The assistant workspace host decides whether a typed ACP Chat change should
post the child snapshot. Active scope chrome/status/permission/session-list and
boundary changes refresh the panel. Background transcript-only changes and pure
append changes are skipped when transcript pagination virtualization is enabled.
When the full/eager fallback is enabled, active append changes may still refresh
to preserve the existing behavior.

## Risks / Trade-offs

- This change intentionally removes the ordinary snapshot refresh path, so any
  initialization path that relies on backend refresh must call it explicitly.
- The typed change model is coarse by design. It avoids the failed branch's
  high-frequency untyped subscription while leaving room to refine categories
  later if a stable user-visible behavior requires it.
- ACP Chat streaming token display under virtualized pagination is allowed to
  wait for boundary/page reload behavior. A later change can add a small live
  delta path if needed.

## Migration Plan

No persisted data migration is required. This is a host publication/read-model
change over the existing ACP Chat session and durable transcript state.

## Open Questions

- None for this change.
