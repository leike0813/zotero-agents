# Design: Assistant Workspace SkillRunner Convergence

## Context

Phase 3 of the refactor plan, on the long-lived `dev-assistant-ui` branch.
The publication plane (coordinator, runtime, adapter interface) is
source-neutral by construction: `AssistantWorkspacePublicationAdapter`
(`src/modules/assistantWorkspacePublicationRuntime.ts`) is the extension
point, and `acpSkillsWorkspaceSurface.ts` is the reference implementation.
The SkillRunner tab still runs the legacy paradigm: `skillRunnerRunDialog.ts`
(5610 LOC) builds a ~120-field decorated snapshot and pushes it through
`CHILD_SNAPSHOT` to `run-dialog.html`, where `runDialog.js`,
`chatThinkingCore.js`, and the SkillRunner branch of
`assistantPanelModel.js` re-project it for the shared imperative renderer.

Two facts shape every decision below:

- SkillRunner has no incremental update channel. Live runs stream chat
  events into an in-memory `session.messages` list (bounded at 500; the
  backend is the SSOT; finished runs re-hydrate history on selection), and
  consumers dedup on a producer-computed `transcriptRevision`. The
  coordinator's per-region JSON signature dedup is the designed absorber
  for exactly this shape.
- The canonical transcript item model (`message` with
  `revision{count,status,repairRound}`, `thought`, `tool-call`, `plan`,
  `status`, `permission`) already covers every SkillRunner conversation
  entry kind, so no wire-level item kinds are added.

## Decisions

### Decision 1: SkillRunner owner identity is request-scoped

`AssistantWorkspaceOwner` gains `{source: "skillrunner", ownerKey,
requestId, runKey}`. `ownerKey` is the request id when assigned, otherwise
the run key (the current child context key behaves the same way). A late
request-id assignment changes the owner key and therefore surfaces as an
owner switch, which the runtime already handles with the owner-first
loading sequence. This matches the AGENTS.md rule that cold mirror caches
are keyed per owner and mirrors today's `requestId ?? runKey` behavior.

### Decision 2: Transcript publishes as snapshots, never mutations

The SkillRunner adapter implements `readTranscriptPage` over the in-memory
`session.messages` (page-first: the first paint comes from messages
already in memory; background history hydration produces a later
snapshot). Steady-state transcript updates are published as transcript
snapshots whose revision comes from the existing boundary signature logic
(`skillRunnerTranscriptSignature`). There is no cold full-mirror LRU layer:
the in-memory session list is the mirror, it is bounded, and paged reads
are served directly from it. Conversation entries are projected to
canonical items producer-side inside the read model, so the child needs no
SkillRunner-specific normalization (`adaptLegacyTranscriptItem` and
`chatThinkingCore.js` die).

### Decision 3: Region projections reuse the existing kinds

Mapping from the legacy snapshot to publication kinds:

- workspace groups/tasks → `owner-navigation` (context drawer keeps
  Running/Completed sections, backend groups, task cards);
- status, status semantics, badges → `owner-presentation` (banner) and
  `owner-control` (toolbar/hint);
- message counts → `message-counts`;
- pending interaction / auth → `owner-control` hint + `composer` (the
  composer keeps doubling as the auth input);
- pending permission → `permission` kind plus a transcript `permission`
  item;
- apply state and diagnostics → `owner-details`;
- `plan` is not supported (SkillRunner has no plan surface today);
- backend health surfaces through the banner, not `service-status`.

### Decision 4: Actions join the typed registry

SkillRunner action payload types move from
`skillRunnerSnapshotContract.ts` into `assistantActionContract.ts` as a
`SkillrunnerAction` discriminated union with the same compile-time drift
guards as the ACP surfaces. Action ids that already exist with identical
semantics gain `skillrunner` in their registry `sources`; SkillRunner-only
actions (`select-task`, `reply-run`, `cancel-run`, `archive-run`,
`auth-import-run`, `resolve-permission`, `copy-request-id`,
`copy-diagnostics`, `open-backend-manager`, …) are added as typed entries.
Drawer toggles and view-mode switches stay panel-local in the child. The
legacy bridge key and `SKILLRUNNER_LEGACY_ACTIONS` are deleted.

### Decision 5: One child page, atomic cutover

A new `skillrunner.html` loads `acp-child.bundle.js` with
`data-source="skillrunner"`. Steps land dark (schema, read model, adapter)
while the legacy path still serves the tab; the shell frame switch, source
routing, and legacy-publish shutdown land atomically; legacy files are
deleted afterwards. Each step keeps the gates green and is independently
revertible. The only component-level child change is the context drawer's
SkillRunner task-group rendering; every other region reuses the existing
components (including `ViewModeToggle` for plain/bubble).

### Decision 6: Standalone dialog mode is removed

`openSkillRunnerRunDialog` and the `hostMode: "dialog"` paths are dead
code: only `deprecated/` entry points call them and the live entry files
are asserted not to. They are deleted together with `run-dialog.html` and
its esbuild entry. The sidebar is the sole SkillRunner host.

### Decision 7: One markdown-it parser for the sidebar

The duplicated markdown-it initialization (`runDialog.js`,
`assistantWorkspaceAcpChild.js` — the latter re-creating the parser per
call) consolidates into one shared `src/sidebar/` parser module exposing a
singleton; the ACP child consumes it, and the run-dialog copy dies with
its file.

### Decision 8: The adapter inherits the transcript publication clock

The dev branch hardened the legacy SkillRunner push path after the refactor
branch was cut (archived changes
`2026-07-20-fix-skillrunner-transcript-publication`,
`2026-07-21-fix-assistant-run-state-convergence`,
`2026-07-22-fix-assistant-waiting-reply-and-skillrunner-transcript-reactivation`).
The adapter keeps those semantics at the publication boundary:

- Transcript qualification is mode-aware and additive
  (`resolveRunWorkspaceTranscriptMessages`): a selected run graduating from
  a local-only snapshot to backend history must replace the pre-submission
  placeholder, and critical refreshes must not swallow live updates.
- `isSkillRunnerDisabledLivePublishBoundary` stays the single classifier
  for live-publish boundaries (HTTP history merges reuse it, as on dev).
- The pending-boundary bit on observer entries carries over: a boundary
  recorded while a refresh is in flight is published once, not dropped.
- The publication clock survives host detach/reattach
  (`clearRunWorkspaceHostState` clears host wiring without resetting
  transcript publication state), so reattached runs never re-publish with
  a regressed revision.

### Decision 9: Interactions and queue use the merged dev contracts

Pending interaction/auth state is projected through the shared
`assistantInteractionContract.ts` DTO (merged from dev) into
`owner-control`, and `submit-interaction-files` stays gated on the
handshake file capability with the managed-staging host path
(`acpSkillRunInteractionFiles.ts` is the ACP twin). Owner-navigation
includes the Queued section with the typed `cancel-queued-workflow-unit`
action, matching the native workflow queue merged from dev.

### Decision 10: Acceptance baseline is the 2026-07-25 behavior analysis

`artifact/assistant-workspace-user-behavior-analysis-20260725.md` §6/§8.7
is the SkillRunner-tab behavior contract (seven lifecycle states, auth
hint suite, no free-form composer, revision entries, auto-reply and
control-indicator badges, backend-unreachable drawer state, no
permission drawer/usage gauge/plan region). The single sanctioned
perceptible change is run switching moving from a full transcript rebuild
to the owner-first loading sequence — classified as an intended
improvement, per
`artifact/assistant-workspace-refactor-improvement-candidates-20260725.md`.

## Risks

- `skillRunnerSnapshotContract.ts` also carries the UI→host action payload
  types; they must move out before the file is deleted (step 1 ordering).
- Test 97's SkillRunner section currently drives the legacy renderer; it
  must be rewritten to drive the child page through publications in the
  same step as the cutover, or regression protection has a gap.
- `test/zotero` live-suite references to `run-dialog` paths must move with
  the page deletion.
- Behavior preservation is the acceptance bar: optimistic task selection,
  the 100-task panel history limit and truncation notice, waiting-auth
  observer, auto-reply semantics, and revision audit all keep their
  current behavior; only the delivery channel changes.
- The dev merge (2026-07-25) added behavior on the legacy path that this
  change must carry across (Decisions 8–9); dropping it during the cutover
  would regress the tab relative to `main`, which is the failure mode the
  merge was meant to prevent.
