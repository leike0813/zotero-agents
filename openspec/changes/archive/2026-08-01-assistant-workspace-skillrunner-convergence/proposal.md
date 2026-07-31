## Why

Phase 3 of the Assistant Workspace refactor
(`artifact/assistant-workspace-refactor-plan-20260718.md`). Two update
paradigms still coexist in the Assistant Workspace sidebar: ACP Chat/Skills
use the strict v1 publication plane, while the SkillRunner tab pushes full
decorated snapshots through the legacy path (`runDialog.js`,
`chatThinkingCore.js`, the SkillRunner branch of `assistantPanelModel.js`,
and the `skillRunnerSnapshotContract` wire envelope). Both share one
renderer and constrain each other. Phase 0 locked the observable
invariants, Phase 1 single-sourced the wire contract, and Phase 2 moved
chrome rendering to Preact components. This change converges the
SkillRunner tab onto the publication plane and deletes the legacy data
plane, leaving one update paradigm for all three tabs.

## What Changes

- Add `source: "skillrunner"` to the publication schema: a third
  `AssistantWorkspaceOwner` branch (owner key = request id, falling back to
  run key for unassigned local runs), region-registry and action-registry
  source entries, child receiver owner-shape branches, and shell routing
  that stops dropping SkillRunner publications.
- Add a SkillRunner surface adapter (`skillRunnerWorkspaceSurface.ts`)
  that projects the poll/reconcile read model of `skillRunnerRunDialog.ts`
  into region publications. SkillRunner has no incremental channel, so the
  adapter publishes transcript snapshots (never mutations) and lets the
  coordinator's signature dedup absorb unchanged regions; conversation
  entries are projected to canonical transcript items producer-side
  (thinking → thought, tool/command processes → tool-call, revision →
  message revision, pending permission → permission).
- Serve the SkillRunner tab from the shared assistant child page
  (`skillrunner.html` with `data-source="skillrunner"`, loading
  `acp-child.bundle.js`); extend the context drawer component to render
  SkillRunner Running/Queued/Completed task-group navigation. SkillRunner
  gains region isolation, owner-first switching, and page-first transcript
  rendering. The run-switch experience becoming owner-first is the single
  sanctioned perceptible change (see the 2026-07-25 improvement-candidates
  artifact); every other behavior in the 2026-07-25 behavior-analysis
  artifact §6/§8.7 is preserved.
- Preserve the transcript publication-clock semantics hardened on the
  legacy path after the branch was cut (mode-aware transcript
  qualification, the shared live-publish boundary classifier, the
  pending-boundary bit, clock preservation across host detach/reattach)
  and the dev-era interaction model: pending interaction/auth projected
  through the shared `assistantInteractionContract.ts` DTO,
  capability-gated `submit-interaction-files`, and the Queued navigation
  section with `cancel-queued-workflow-unit` from the native workflow
  queue.
- Route SkillRunner UI actions through the typed action registry; migrate
  the action payload types out of `skillRunnerSnapshotContract.ts` and
  delete the legacy action vocabulary and bridge.
- Delete the legacy data plane: `runDialog.js`, `runDialogApp.js`,
  `chatThinkingCore.js`, `run-dialog.html` and its esbuild entry, the
  SkillRunner branch of `assistantPanelModel.js` /
  `assistantPanelRenderer.js`, `adaptLegacyTranscriptItem`, the decorated
  snapshot push plane in `skillRunnerRunDialog.ts`, and
  `skillRunnerSnapshotContract.ts`. Consolidate the duplicated markdown-it
  initialization into one shared sidebar parser module.
- Remove the standalone Run Details dialog mode
  (`openSkillRunnerRunDialog`, `hostMode: "dialog"`); it is dead code
  reachable only from `deprecated/` entry points. The sidebar is the sole
  SkillRunner host.

## Capabilities

### New Capabilities

- `skillrunner-workspace-surface`: the SkillRunner run workspace projects
  its read model into v1 region publications through a stateless surface
  adapter; transcript reads are page-first over the in-memory session
  history; SkillRunner run semantics (waiting_user, auth, cancel,
  permission, revision/replacement audit, task drawer organization) are
  preserved end to end.

### Modified Capabilities

- `assistant-workspace-publication-data-plane`: the v1 publication
  vocabulary admits `skillrunner` as a third source with a request-scoped
  owner identity; domain mappings are exhaustive for every registered
  source; SkillRunner transcript publishes as snapshots, not mutations.
- `assistant-workspace-ui-refresh-governance`: the SkillRunner tab joins
  the region-isolation invariants (transcript-only updates preserve chrome
  node identity, owner-first loading, page-first transcript).
- `assistant-workspace-chrome-components`: the shared assistant child page
  also boots as the SkillRunner surface; the context drawer renders
  SkillRunner task-group navigation; the SkillRunner imperative path is no
  longer preserved.
- `assistant-sidebar-build-pipeline`: the `run-dialog` bundle entry is
  removed; the SkillRunner page loads the shared `acp-child` bundle.
- `assistant-sidebar-ui`: the SkillRunner tab loads the shared assistant
  child page instead of `run-dialog.html`; all user-visible run semantics
  are preserved.

## Impact

Affected areas: `src/shared/assistantWireContract.ts`,
`src/shared/assistantActionContract.ts`,
`src/shared/assistantInteractionContract.ts` (merged from dev; the
SkillRunner pending interaction/auth projection consumes its DTO),
`src/modules/assistantWorkspacePublication.ts`,
`src/modules/assistantWorkspaceTranscriptPublication.ts`,
`src/modules/skillRunnerRunDialog.ts` (read-model API added, push plane
deleted), new `src/modules/skillRunnerWorkspaceSurface.ts`,
`src/modules/assistantWorkspaceSidebar.ts`,
`src/sidebar/assistantWorkspaceShell.js`,
`src/sidebar/assistantWorkspaceAcpChild.js`,
`src/sidebar/components/ContextDrawerRegion.tsx`, new
`addon/content/sidebar/skillrunner.html`, `zotero-plugin.config.ts`,
deleted `src/sidebar/runDialog.js` / `runDialogApp.js` /
`chatThinkingCore.js` / `addon/content/sidebar/run-dialog.html` /
`src/shared/skillRunnerSnapshotContract.ts`, SkillRunner branches of
`src/sidebar/assistantPanelModel.js` / `assistantPanelRenderer.js`,
`deprecated/assistant-sidebar-entrypoints/skillRunnerSidebar.ts`, and the
SkillRunner test family (`test/core/65/69/71/76/83/84/94/95/97/184/190/191`
plus `test/helpers/skillRunnerWorkspaceSnapshotHarness.ts` and
`test/zotero` references). No persistence-format, backend-protocol, or
run-semantics changes.
