## Context

The SkillRunner sidebar child panel renders the non-transcript shell first and
then schedules transcript rendering separately in `addon/content/sidebar/run-dialog.js`.
Before this change, `scheduleTranscriptRender()` deferred the real
`renderTranscript()` call with `requestAnimationFrame()` and then `setTimeout()`.

Linux Zotero diagnostics showed the visible SkillRunner iframe had a mounted
chat panel and all required renderer globals, but transcript DOM stayed empty.
The same iframe could fire `requestAnimationFrame()`, while the follow-up timer
probe did not fire. ACP panels were unaffected because their transcript render
paths do not use this extra frame-plus-timer chain.

## Goals / Non-Goals

**Goals:**

- Make SkillRunner transcript rendering independent from a timer scheduled
  inside a frame callback.
- Preserve the existing revision/mode gate, stale-render token, and pending
  snapshot coalescing behavior.
- Keep the code-level rollback small and local to `run-dialog.js`.

**Non-Goals:**

- Do not change ACP chat or ACP skill-run transcript rendering.
- Do not change `AssistantTranscriptRenderer`.
- Do not refactor the dual Assistant Workspace host design.
- Do not introduce a new UI test harness for Zotero chrome iframes in this
  small fix.

## Decisions

- Use a local `scheduleTranscriptMicrotask(callback)` helper in
  `addon/content/sidebar/run-dialog.js`.
  - Prefer `window.queueMicrotask(callback)`.
  - Fall back to `window.Promise.resolve().then(callback)`.
  - Fall back to direct `callback()` when neither microtask primitive exists.
- Keep `scheduleTranscriptRender(panelSnapshot)` as the single caller and leave
  its render token, pending snapshot, and revision bookkeeping unchanged.
- Avoid moving transcript rendering into the main synchronous panel render body;
  the microtask still runs after the current call stack, limiting re-entrancy
  risk while avoiding the unreliable timer path.

## Risks / Trade-offs

- Earlier transcript DOM work may run before the browser paints the shell.
  Mitigation: the work still runs after the current call stack, and the shared
  transcript renderer already performs its own stick-to-bottom frame correction.
- Very long transcripts may do work sooner than the previous timer path.
  Mitigation: existing revision gating and node-map diffing remain unchanged.
- If the microtask scheduler causes regressions, rollback is local:
  remove `scheduleTranscriptMicrotask()` and restore the prior
  `requestAnimationFrame(function () { setTimeout(run, 0); })` branch plus the
  `setTimeout(run, 0)` fallback inside `scheduleTranscriptRender()`.
