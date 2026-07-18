# Assistant Workspace ACP Round 7 UI and Replay Audit

## Scope

This audit tracks the UI semantic and Replay integrity regressions remaining
after the v5 shared-runtime migration. It is updated as implementation evidence
and formal verification become available.

## Confirmed root causes

- Presentation usage, connection, recovery, and workspace arrays are flattened
  into one indicator list and rendered as LEDs.
- The shared child removes clicked owner identity and sends the currently
  selected owner for all Host actions.
- Skills navigation uses raw run status and substitutes it for missing backend
  status instead of using the workflow-task state projection.
- The exact projector bypasses nested shared labels and contains visible
  hard-coded English.
- Empty selection hides the complete main grid, removing transcript and
  composer layout anchors.
- Round6 formal results contain transcript render rejections; Skills rebase
  amplification exceeds its publication byte budget.
- Lifecycle snapshots omit bounded ACK failure details, and Replay preparation
  has no cross-surface publication epoch.
- The profiler lifecycle ledger originally stopped at 512 records, so valid
  later ACKs were misclassified as out-of-window and correctness evidence was
  silently lost.
- The forced Replay barrier could be created before a queued 16 ms region lane
  was materialized, allowing precursor publications to land after the barrier.
- The local formal runner inherited a preceding test's `live` display
  preference. The accepted matrix is defined for the same explicit `boundary`
  setting in both Chat and Skills runs; mixing modes produced incomparable byte
  results.

## Implementation evidence

- Publication schema v6 now uses exact semantic presentation and action
  registries. Unknown fields, v5 envelopes, legacy aliases, duplicated owner
  fields, and source-incompatible actions are rejected.
- The shared child preserves the clicked navigation owner for target actions.
  Chat sessions and Skills tasks can be selected from their drawers without
  substituting the currently selected owner.
- Service status is the only LED projection. Usage is rendered as a gauge,
  including an explicit unavailable state, while connection, recovery,
  workspace, metadata, and diagnostics retain their semantic presentation.
- Skills navigation and owner cards project workflow status, backend status,
  apply state, attention, title, subtitle, workflow, backend, and update time as
  independent axes. Workflow-task state remains the status SSOT.
- Shared ACP visible labels and ARIA text are injected through the label DTO and
  governed across all 11 plugin locales.
- Empty/loading selections keep the main grid, transcript pane, and composer
  anchors mounted, preventing the Skills empty state from collapsing the lower
  layout.
- Transcript mutation application is transactional. Virtual rows, node maps,
  signatures, page metadata, and canonical child state commit only after the
  renderer succeeds. A failed render returns bounded stage/code diagnostics and
  the same signature remains retryable.
- Lifecycle records are created only by in-window posts, preserve exact source,
  form, cause, and delivery sequence, and use first-terminal-wins semantics.
  Correctness ledgers are independent of metric-series capacity; lifecycle
  overflow is explicit measurement incompleteness.
- Replay preparation drains both ACP publication lanes and captures a
  source-aware epoch. The forced diagnostic barrier first flushes pending Host
  runtime region work, so all same-tab precursor publications are included.
- Formal acceptance is independent of execution completion and measurement
  completion, and rejects recovery, automatic rebase, forbidden
  materialization, byte-budget excess, and lifecycle gaps.

## Verification evidence

- Focused publication, UI, profiler, Replay, sidecar, logical-time, and Skills
  transcript tests pass, including the sanitized Round6 renderer failure
  fixture.
- Real Zotero nested Workspace tests pass for production Chat and Skills
  target-active paths and Host → shell → child publication.
- Final Chat report:
  `/home/joshua/Workspace/Artifact/Zotero-Skills/Zotero_data/zotero-agents/runtime/profiles/acp-replay/acp-replay-chat-2026-07-15t10-41-23-627z-1__after-r3-round7__logical__2026-07-16T15-21-29-722Z-1.json`
  - execution complete; measurement complete; acceptance accepted;
  - both formal runs use `boundary`;
  - 364,063 posted bytes per run, below 2.7 MB;
  - 214 lifecycle records per run, all accepted, with zero drops,
    diagnostics, rebase, or recovery publications.
- Final Skills report:
  `/home/joshua/Workspace/Artifact/Zotero-Skills/Zotero_data/zotero-agents/runtime/profiles/acp-replay/acp-replay-skills-2026-07-13t10-08-16-777z-1__after-r3-round7__logical__2026-07-16T15-24-13-607Z-2.json`
  - execution complete; measurement complete; acceptance accepted;
  - both formal runs use `boundary`;
  - 554,334 and 550,773 posted bytes, both at or below 557,610;
  - 307 and 302 lifecycle records, all accepted, with zero drops,
    diagnostics, rebase, or recovery publications.

## Final zero-reference checks

- `npm run lint:check` passes.
- `npm run build` passes, including production packaging and `tsc --noEmit`.
- `npm run check:help-docs` passes with 504 documents and 53 assets;
  `addon/content/help-docs` has no generated diff.
- Localization governance and `git diff --check` pass.
- The Round 7 OpenSpec change passes strict validation.
- Full strict OpenSpec validation reports 233 passing specs/changes and only
  two unrelated pre-existing failures:
  `acp-startup-prompt-preambles` has a too-brief Purpose, and
  `mineru-long-pdf-page-range-splitting` has no Purpose section.
- Production searches under `src` and `addon` find no references to the removed
  surface/read-model modules, source-specific ACP child assets, legacy snapshot
  subscriber names, performance-test posting hook, Replay governance alias,
  `requiresResync`/`resync-required`, or publication v3/v4 schemas.
- The ordinary real-Zotero UI test remains portable: the temporary local trace
  runner and machine-specific Artifact path are absent from
  `test/ui/183-acp-runtime-replay-publication-zotero-runtime.test.ts`.
