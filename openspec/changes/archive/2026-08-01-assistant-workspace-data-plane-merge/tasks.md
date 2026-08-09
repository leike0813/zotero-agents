# Tasks: Assistant Workspace Data-Plane Merge And God-File Split

## 1. Generic Transcript Mirror Store + Chat Migration

- [x] 1.1 New `src/modules/assistantTranscriptMirrorStore.ts`: shared cold-mirror LRU (10 slots), live/pinned exemption, scheduled full-mirror hydrate, page-first indexed reads, mirror event application, event queueing, streaming coalescing drivers; all per-source variation injected via `AssistantTranscriptMirrorOwnerDescriptor` (ownerKey, isPinned, allocateItemId, streamingSegments, plan mode, continuity hooks, notHydratedQueue, emit/persist callbacks). Parameterize by owner source only — never by backend id, provider, agent family, or product string.
- [x] 1.2 New `src/modules/acpChatTranscriptMirror.ts`: Chat descriptor wiring + transcript portions of `handleSessionUpdate`; migrate `acpSessionManager.ts` sections 1100-1173, 1774-2514, 4237-4442. Keep `getAcpChatTranscriptMirrorDiagnosticsForTests` shape.
- [x] 1.3 Verify without modifying tests: 96, 171, 184 green; build green.

## 2. Skills Migration Onto The Generic Store

- [x] 2.1 New `src/modules/acpSkillRunTranscriptMirror.ts`: Skills descriptor wiring (ordinal item ids with hydrate recovery, `plan: "external"`, continuity bookkeeping, not-hydrated queue branch) + `recordAcpSkillRunSessionUpdate`; migrate `acpSkillRunStore.ts` sections 681-1607, 4097-4572, mirror diagnostics.
- [x] 2.2 Fold `acpConversationTranscriptStore.ts` away if the generic store makes it trivial; otherwise remove its `as never` casts.
- [x] 2.3 Verify without modifying tests: 107, 171, 184 green.

## 3. Session Manager Remainder Split

- [x] 3.1 New `src/modules/acpChatWorkspaceDataPlane.ts`: owner navigation, read models, change build/emit/publish/subscribe (853-1100, 1364-1658, 4117-4237).
- [x] 3.2 New `src/modules/acpChatSkillInjection.ts`: managed-skill materialization subdomain (3208-3891).
- [x] 3.3 `acpSessionManager.ts` keeps domain core only (registry, attach/ensureSession, bindAdapter, handleSessionUpdate, lifecycle API); ≤ ~2k LOC; mirror→data-plane emission via injected callbacks, no reverse imports.

## 4. Skill Run Store Remainder Split

- [x] 4.1 New `src/modules/acpSkillRunPersistence.ts`: parsers/normalizers/persist/retention (1809-2825).
- [x] 4.2 New `src/modules/acpSkillRunWorkspaceDataPlane.ts`: change queue/emit, read models, region reads, summaries (2915-3275, 5826-6513).
- [x] 4.3 `acpSkillRunStore.ts` keeps domain core (status transitions, `upsertAcpSkillRun`, lifecycle actions, permission, controllers, selection); ≤ ~2k LOC; barrel re-exports stabilize the ~15 existing import sites.

## 5. Sidebar Split + Shared Action Dispatch Table

- [x] 5.1 New `src/modules/assistantWorkspacePublicationHost.ts`: publication registration/scheduling, snapshot delivery, baseline-init, ack/observation, diagnostics lanes.
- [x] 5.2 New `src/modules/assistantWorkspaceActionRouter.ts`: `handleChildAction` entry + dispatch table `Record<Action, Partial<Record<Source, Handler>>>`; collapse duplicated handler bodies (`resolve-permission`, `copy-diagnostics`, `open-workspace`, `set-mode/model/effort`, `cancel-queued-workflow-unit`, `open-backend-manager`, `set-execution-display-mode`); `load-transcript-page`/`request-owner-details` via `Record<source, adapter>`; SkillRunner payload normalization as skillrunner-cell preprocessing. The five `TODO(contract)` routes stay verbatim with markers.
- [x] 5.3 `assistantWorkspaceSidebar.ts` keeps shell host only (mount/dock/handshake/bridge/facade, ~1400 LOC).
- [x] 5.4 Verify: 184, 190, 97, 71, 95, 193 green.

## 6. Surface Adapter Skeleton Extraction

- [x] 6.1 Shared module: change-kind→publication-kind mapping machinery, owner-control DTO assembly, skills/skillrunner owner-navigation builder skeleton, adapter literal factory.
- [x] 6.2 Per-source files keep read-model branches, hint projections, state machines, source-specific blocks.
- [x] 6.3 Verify: 184, 193, 97 green.

## 7. Permission / Audit Merges

- [x] 7.1 `hostBridgePermissionManager.ts`: collapse the three `request*ScopedPermission` copies into one function parameterized by `{kind, ownerKey, setRequest}`; preserve handler-callback indirection and current pending-state locations.
- [x] 7.2 Shared buffered-NDJSON audit append core under `acpSkillRunAuditTrail.ts` (keeps multi-file layout + sanitization) and `acpChatDiagnosticAuditTrail.ts` (keeps discard latch); overflow policy and schemas unchanged.
- [x] 7.3 Verify: 96-permissions, 109, 107, 108, 138 green.

## 8. Orchestrator Split

- [x] 8.1 New `src/modules/acpSkillRunRecovery.ts`: recovery/continuation subdomain (1774-3699).
- [x] 8.2 New `src/modules/acpSkillRunExecutionSupport.ts`: prompt build, hard-timeout monitor, MCP preflight, permission wrap.
- [x] 8.3 `acpSkillRunnerOrchestrator.ts` keeps main execution; ≤ ~2k LOC.
- [x] 8.4 Verify: 107 and orchestrator-related suites green.

## 9. Dead Chrome Renderer Cleanup

- [x] 9.1 `assistantPanelRenderer.js`: delete imperative chrome render functions without production callers (~2700 LOC); keep `adoptPanelRegions`, `managedMount`, `installOverlayDismiss`, `markRegion`, `shouldManageRegion` and live dependencies.
- [x] 9.2 Adjudicate the six test-97 call sites (415, 517, 1504, 2316, 2513, 2558): delete where publication-plane cases cover the same DOM identity/content semantics; re-point to the Preact component seam otherwise. Record each adjudication. Keep the test-190 source-scan entry.
- [x] 9.3 Verify: 97, 190 green.

## 10. Documentation And Gates

- [x] 10.1 Append Phase 4 implementation notes to `artifact/assistant-workspace-refactor-plan-20260718.md` (including deviations and test-97 adjudications).
- [x] 10.2 Check AGENTS.md hard-constraint wording for implementation-mechanism references that moved (mirror module names, dispatch table); update mechanism wording, preserve every behavioral invariant.
- [x] 10.3 `openspec validate 2026-08-01-assistant-workspace-data-plane-merge --strict`.
- [x] 10.4 `npm run build`; focused suites (96/107/171/184/190/193/97/71/95/109 + acp family); `npm run test:node:core`.
- [x] 10.5 `npm run lint:check`, `npm run check:localization-governance`, `npm run check:help-docs`, `npm run check:ssot-invariants`, `npm run test:lite`.
- [x] 10.6 Quantitative review: the four split files each ≤ ~2k LOC; ≥ 2.5k LOC of parallel logic eliminated.
