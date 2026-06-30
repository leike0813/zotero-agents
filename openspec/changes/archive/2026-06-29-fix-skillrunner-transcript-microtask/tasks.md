# Tasks

## 1. Implementation

- [x] 1.1 In `addon/content/sidebar/run-dialog.js`, add a local
  `scheduleTranscriptMicrotask(callback)` helper.
- [x] 1.2 Make the helper prefer `window.queueMicrotask`, fall back to
  `window.Promise.resolve().then`, and finally call the callback synchronously
  when no microtask primitive is available.
- [x] 1.3 Replace the previous
  `requestAnimationFrame(function () { setTimeout(run, 0); })` scheduling path
  in `scheduleTranscriptRender(panelSnapshot)` with
  `scheduleTranscriptMicrotask(run)`.
- [x] 1.4 Preserve `transcriptRevision`, `transcriptRenderedMode`,
  `transcriptRenderToken`, and `pendingTranscriptSnapshot` behavior unchanged.

## 2. Rollback Notes

- [x] 2.1 Rollback is local to `addon/content/sidebar/run-dialog.js`: remove
  `scheduleTranscriptMicrotask(callback)`.
- [x] 2.2 Restore the prior `scheduleTranscriptRender(panelSnapshot)` tail:
  use `window.requestAnimationFrame` when available, call `setTimeout(run, 0)`
  inside its callback, and otherwise call `setTimeout(run, 0)` directly.
- [x] 2.3 No ACP panel, shared transcript renderer, data contract, dependency,
  or Assistant Workspace host change is part of this rollback.

## 3. Verification

- [x] 3.1 Run `npm run build`.
- [x] 3.2 In Linux Zotero developer tools, select the visible
  `assistant-workspace.html` iframe and its visible SkillRunner iframe.
- [x] 3.3 Confirm `#chat-panel` has non-zero dimensions and the transcript
  container renders transcript rows or the configured empty transcript state.
- [x] 3.4 Confirm SkillRunner transcript rendering no longer depends on a
  successful `setTimeout` probe scheduled after `requestAnimationFrame`.
