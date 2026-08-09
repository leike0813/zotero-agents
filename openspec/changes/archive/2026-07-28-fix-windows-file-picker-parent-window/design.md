## Context

Every workflow file-picker mode resolves its parent through the shared runtime
helper. The old resolver accepted the first truthy dialog or preferences window,
even when it was closed or could not supply the `BrowsingContext` required by
Zotero's native picker. Windows rejects that invalid native initialization.

## Goals / Non-Goals

**Goals:**

- Ensure every shared runtime file-picker mode receives a usable native parent.
- Preserve a live dialog or preferences window as the preferred parent.
- Fall back safely to the Zotero main window.

**Non-Goals:**

- Change workflow file-picker APIs, picker modes, or ZIP export behavior.
- Add operating-system-specific branches or upgrade dependencies.

## Decisions

- Validate parent candidates in `src/platform/filePicker.ts`, the single shared
  boundary used by workflow and non-workflow picker callers. This fixes every
  affected caller without duplicating Windows logic in individual workflows.
- Treat a parent as usable only when it is open and exposes a browsing context;
  safely reject property reads from disposed wrappers. Zotero's native picker
  initializes from that context.
- Keep the existing preference order of dialog, preferences, then main window,
  while skipping invalid candidates. Always using the main window would avoid
  the failure but would unnecessarily detach a picker from its active dialog.

## Risks / Trade-offs

- [A host window becomes invalid between validation and picker opening] → The
  native picker can still reject the call, but the resolver removes the known
  stale-reference path and does not retain picker state.
- [A test mock lacks browser-window fields] → Tests must model a
  `browsingContext` when asserting that a window is passed to the native picker.
