# Design

## Chosen Model

ACP Chat uses a session-manager-owned transcript mirror as the live authority for connected active conversations and the foreground conversation. Transcript events fold into the mirror synchronously, then persist to JSONL asynchronously.

The front-end renders only `snapshot.items` for the selected conversation. It no longer keeps transcript cursors, loaded revisions, page state, or delta recovery state.

## Cold Hydrate

Cold conversation selection commits immediately. The snapshot carries metadata and `transcriptState.state = "loading"` while the session manager hydrates the mirror from JSONL in the background. Hydrate completion emits a later snapshot with `transcriptState.state = "ready"` and full `items`.

Hydrate failure is scoped to transcript display. It must not block session switching or backend/session state projection.

## UI Refresh Boundary

Transcript-only snapshots update only the transcript renderer. The panel shell render key excludes transcript items, transcript revision, preview, usage, and chunk-only fields. Banner menus, drawers, reply controls, and permission UI rebuild only when structural session state changes.

## Session Drawer

The banner conversation selector remains active-backend scoped. The session drawer uses `backendChatSessions` and groups sessions by backend, so users can see all backend sessions regardless of the active backend.

## Rejected Approaches

Keeping ACP Chat page/delta on top of the mirror is rejected. It would retain the split transcript state machine that caused stale pages, missed deltas, and shell rebuild churn.
