# Design: Assistant Workspace Data-Plane Merge And God-File Split

## Context

Phase 4 of the refactor plan, on the long-lived `dev-assistant-ui` branch.
The publication plane is source-neutral; the duplication lives below it,
in the two ACP stores and the sidebar host. Exploration on 2026-07-31
established the exact parallel inventories:

- Chat mirror/LRU/streaming: `acpSessionManager.ts` sections at
  251-252, 1085-1171, 1221-1264, 1774-2133, 2447-2512, 4167-4440
  (~750-800 LOC).
- Skills mirror/LRU/streaming: `acpSkillRunStore.ts` sections at
  584-620, 748-1607, 4097-4572, 5939-5966, 6291-6411 (~1000-1100 LOC).
- Persistence is already aligned: both sources write through the indexed
  JSONL store `acpSkillRunTranscriptStore.ts`; Chat reaches it through
  the 101-line `acpConversationTranscriptStore.ts` adapter.
- Shared primitives already extracted: `acpTranscriptBoundary.ts`
  (update-kind boundary classification), `assistantTranscriptPageProjection.ts`
  (UI-visible page projection), `assistantWorkspaceTranscriptPublication.ts`
  (wire DTOs/mutations), `bufferedWriteCoordinator.ts`,
  `runtimePersistence.ts`.

## Decisions

### Decision 1: One generic mirror store parameterized by owner descriptor

New `src/modules/assistantTranscriptMirrorStore.ts` owns the cold-mirror
LRU (10 slots), live/pinned exemption, full-mirror hydrate with
scheduled/background loading, page-first indexed reads, mirror event
application (upsert/append_text/patch_item/delete_item), event queueing,
and streaming text coalescing drivers. Per-source variation is injected
as an `AssistantTranscriptMirrorOwnerDescriptor`:

- `ownerKey`: Chat `backendId + "\n" + conversationId`; Skills `requestId`.
- `isPinned(ownerState)`: Chat live-session/foreground predicate; Skills
  lifecycle-open/selected predicate.
- `allocateItemId`: Chat random opaque ids; Skills ordinal ids with
  ordinal recovery on hydrate.
- `streamingSegments`: Chat dual assistant/thought segment tracking;
  Skills single `lastTextItem` tracking.
- `plan: "transcript-item" | "external"`: Chat patches a plan transcript
  item in place; Skills routes plan entries to the run record. This is
  the one structural divergence that cannot fold into a simple callback;
  it is an explicit mode on the descriptor.
- `continuity`: Skills-only tool/permission/status bookkeeping hooks.
- `notHydratedQueue`: Skills-only branch that persists events and sets
  `needsHydrate` without touching the mirror when a durable transcript
  exists but the mirror is cold.
- `emit`/`persist` callbacks: Chat session snapshot emission and
  conversation persistence; Skills workspace-change emission and run
  persistence.

Parameterization is by owner *source* (chat/skill-run), never by backend
id, provider id, agent family, or product string — the AGENTS.md ACP
Transcript Projection constraint. Both sources keep consuming the shared
boundary classifier `acpTranscriptBoundary.ts`.

The mirror state host stays per-source (embedded in the Chat session
runtime vs the Skills `transcriptLiveStates` side table); the generic
store operates on a state handle supplied by the driver, so no ownership
model is forced on either side.

### Decision 2: Per-source drivers are thin and stay owner-API-compatible

`acpChatTranscriptMirror.ts` and `acpSkillRunTranscriptMirror.ts` hold
only the descriptor wiring plus the source-specific session-update
drivers (`handleSessionUpdate` transcript portions,
`recordAcpSkillRunSessionUpdate`). Test-facing diagnostics
(`getAcpChatTranscriptMirrorDiagnosticsForTests`,
`getAcpSkillRunTranscriptMirrorDiagnosticsForTests`) keep their exact
shapes — tests 96/107/171 are the acceptance contract and are not
modified.

### Decision 3: God-file split boundaries follow the dependency direction

Dependency order today: `acpSkillRunStore` / `acpSessionManager`
(bottom, mutually independent) ← orchestrator / surfaces ←
`assistantWorkspaceSidebar` (top) ← `acpSkillRunForeground`, replay
ports. Splits preserve it:

- `acpSessionManager.ts` → domain core (registry, attach/ensureSession,
  bindAdapter, handleSessionUpdate, lifecycle API) +
  `acpChatTranscriptMirror.ts` (Decision 2) +
  `acpChatWorkspaceDataPlane.ts` (owner navigation, read models, change
  emit/publish/subscribe) + `acpChatSkillInjection.ts` (~680-line
  self-contained managed-skill subdomain).
- `acpSkillRunStore.ts` → domain core (status transitions, upsert,
  lifecycle actions, permission, controllers, selection) +
  `acpSkillRunTranscriptMirror.ts` (Decision 2) +
  `acpSkillRunPersistence.ts` (parsers/normalizers/persist/retention) +
  `acpSkillRunWorkspaceDataPlane.ts` (change queue/emit, read models,
  region reads, summaries).
- `assistantWorkspaceSidebar.ts` → shell host (mount/dock/handshake/
  bridge/facade) + `assistantWorkspacePublicationHost.ts` (registration,
  scheduling, snapshot delivery, baseline-init, ack/observation,
  diagnostics lanes) + `assistantWorkspaceActionRouter.ts` (Decision 4).
- `acpSkillRunnerOrchestrator.ts` → main execution +
  `acpSkillRunRecovery.ts` (recovery/continuation subdomain) +
  `acpSkillRunExecutionSupport.ts` (prompt build, hard-timeout monitor,
  MCP preflight, permission wrap).

Cycle control: mirror and persistence modules never import the
data-plane modules; emission and persistence cross the boundary as
injected callbacks (the existing `acpSkillRunPermissionFacade` cycle-
breaker pattern is the fallback). Existing import sites (~15 for the
skill-run store) are stabilized with barrel re-exports from the original
module paths, per the Phase 1 precedent
(`assistantWorkspacePublication.ts` re-exporting the wire contract).

### Decision 4: One dispatch table keyed by action then owner source

`assistantWorkspaceActionRouter.ts` keeps `handleChildAction`'s single
entry (envelope validation, owner parsing, registry route validation,
selected-owner guard) and replaces the three per-source router functions
with a table `Record<Action, Partial<Record<Source, Handler>>>` whose
handler signature is uniform (`{host, target, owner, payload}`).
Handlers shared across sources exist once (`resolve-permission`,
`copy-diagnostics`, `open-workspace`, `set-mode`, `set-model`,
`set-reasoning-effort`, `cancel-queued-workflow-unit`,
`open-backend-manager`, `set-execution-display-mode`); the SkillRunner
payload normalization in `dispatchSkillRunnerWorkspaceAction` becomes
the table's skillrunner-cell preprocessing. `load-transcript-page` and
`request-owner-details` lose their three-way branches to a
`Record<source, adapter>` lookup. The five `TODO(contract)` routes
(`end-session`, `rename-conversation`, `reconnect`, `toggle-diagnostics`,
`toggle-status-details`) stay verbatim with their markers — they are
parked improvement candidates, not dead code to clean.

### Decision 5: Adapter skeleton shared, read models per-source

A shared module takes the change-kind→publication-kind mapping +
flatMap/dedupe machinery, the owner-control DTO assembly (the 8-field
block that is near-identical across all three adapters), the
skills/skillrunner owner-navigation builder skeleton, and an adapter
literal factory over `defineAssistantWorkspacePublicationAdapter`. Each
surface file keeps its read-model branches, hint projection, state
machines, and source-specific blocks (chat background-change gating,
skills interaction state machine, skillrunner badges/composer gating).

### Decision 6: Permission and audit merges dedupe plumbing, not state

- `hostBridgePermissionManager.ts`: the three
  `request*ScopedPermission` copies collapse into one function
  parameterized by `{kind, ownerKey, setRequest}`. Pending permission
  state stays where it lives (Chat session runtime snapshot, Skills run
  record, SkillRunner external registry) because it drives region
  signatures; the handler-callback indirection is preserved.
- New shared buffered-NDJSON audit append core (enqueue with the
  existing 2048-entry/2MB drop-oldest policy, overflow/failure logging,
  flush/release/discard lifecycle) under `acpSkillRunAuditTrail.ts`
  (keeps multi-file layout + sanitization) and
  `acpChatDiagnosticAuditTrail.ts` (keeps the discard latch). Behavior,
  file layouts, and schemas are unchanged.

### Decision 7: Dead chrome renderer removal adjudicates test 97 case by case

`assistantPanelRenderer.js` keeps `adoptPanelRegions`, `managedMount`,
`installOverlayDismiss`, `markRegion`, `shouldManageRegion`, and their
live dependencies only (~350 LOC). For each of the six test-97 direct
call sites (lines 415, 517, 1504, 2316, 2513, 2558): if the asserted
behavior (usage-gauge placeholder, banner meta-pill, reply select
state, drawer status axis, task-row DOM identity, drawer structure
refresh) is already covered by publication-plane cases driving the
Preact components, the call site is deleted; otherwise it is re-pointed
to render the corresponding Preact component seam with the same
assertion. Each adjudication is recorded in the change's tasks and the
phase notes. The test-190 source-scan entry stays (the file remains).

## Risks / Trade-offs

- **Descriptor hook sprawl**: the generic store is validated on the Chat
  migration first; if the Skills migration (which exercises
  `plan: "external"`, continuity hooks, and the not-hydrated branch)
  shows the hook surface becoming implicit coupling, stop and report
  instead of forcing the merge.
- **Split-time cycles**: mirror→emit and persistence→record are the
  likely cycle points; all cross-boundary calls are injected.
- **Test-97 misjudgment**: every deleted call site requires a named
  existing case asserting the same DOM identity/content semantics.
- **Barrel re-exports hide bad boundaries**: barrels are a migration
  stabilizer; after the split lands, import sites may be repointed
  directly and barrels thinned.

## Migration Plan

Lands as stacked commits on `dev-assistant-ui`, each independently green
and revertible (tasks.md order): OpenSpec docs → generic store + Chat
migration → Skills migration → session-manager split → skill-run-store
split → sidebar split + dispatch table → adapter skeleton →
permission/audit merges → orchestrator split → dead renderer cleanup →
docs/gates. No deploy or data migration: pure code motion, persistence
formats untouched.

## Open Questions

None at change-open time. The two scope questions from planning are
decided: the orchestrator split is in scope; the mirror merge is fully
parameterized (not a partial shared kernel).
