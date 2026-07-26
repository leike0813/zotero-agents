## 1. Wire Schema Admits SkillRunner

- [ ] 1.1 Extend `test/core/184` first: add a `createSkillRunnerWorkspaceOwner` fixture, extend the parameterized source loops to `"skillrunner"`, and flip the legacy-source rejection assertions; keep 190 green.
- [ ] 1.2 `src/shared/assistantWireContract.ts`: add `"skillrunner"` to `AssistantWorkspacePublicationSource`, add the third `AssistantWorkspaceOwner` branch (`ownerKey`, `requestId`, `runKey`), remove `SKILLRUNNER_LEGACY_ACTIONS` as its actions migrate.
- [ ] 1.3 `src/modules/assistantWorkspacePublication.ts`: skillrunner owner branch in `assertAssistantWorkspacePublication`; add `skillrunner` to the supported `sources` of the region kinds the adapter publishes; extend `ASSISTANT_WORKSPACE_ACTION_REGISTRY`.
- [ ] 1.4 `src/shared/assistantActionContract.ts`: add the `SkillrunnerAction` union with payload types migrated from `skillRunnerSnapshotContract.ts` (reply-run interaction/auth modes, resolve-permission, select-task, cancel-run, archive-run, auth-import-run, copy actions, open-backend-manager); drift guards stay green.
- [ ] 1.5 `src/modules/assistantWorkspaceTranscriptPublication.ts`: skillrunner branch in the owner/page-request parsers.

## 2. Read Model And Surface Adapter (lands dark)

- [ ] 2.1 New `test/core/19x-skillrunner-workspace-surface.test.ts` first: real run fixtures → region publications; conversation entries → canonical items (thought/tool-call/revision/permission); page-first transcript reads; owner-switch loading-first; publication-clock cases from Decision 8 (mode-aware qualification on local→history graduation, pending-boundary delivery, clock preserved across detach/reattach).
- [ ] 2.2 `skillRunnerRunDialog.ts`: expose the read-model API — `subscribeSkillRunnerWorkspaceChanges`, `getSkillRunnerWorkspaceReadModel`, `readSkillRunnerTranscriptRegion`, navigation summaries — without changing run tracking, observers, or persistence.
- [ ] 2.3 New `src/modules/skillRunnerWorkspaceSurface.ts`: `SKILLRUNNER_WORKSPACE_ADAPTER` mirroring `acpSkillsWorkspaceSurface.ts`; `supportedKinds` excludes `plan` (and `service-status`); transcript publishes snapshots only; publication clock reuses `skillRunnerTranscriptSignature` and the `isSkillRunnerDisabledLivePublishBoundary` classifier (Decision 8); pending interaction/auth projects through `assistantInteractionContract.ts`; owner-navigation includes the Queued section (Decision 9).
- [ ] 2.4 `assistantWorkspaceSidebar.ts`: subscribe and `runtime.schedule`; extend `getActiveOwner`, `onTranscriptRebaseRequired`, `handleChildAction`, `parseAssistantWorkspaceActionOwner`, and metric label literals to skillrunner; route `submit-interaction-files` through the capability-gated staging path and `cancel-queued-workflow-unit` through the queue (Decision 9).

## 3. Child And Shell Cutover (atomic)

- [ ] 3.1 Rewrite the `test/core/97` SkillRunner section first to drive `data-source="skillrunner"` child page through publications with the same subtree node-identity assertions; rewrite `test/core/71` to behavior tests over the publication boundary; rework `test/helpers/skillRunnerWorkspaceSnapshotHarness.ts` to capture publications. The dev-merge versions of 71/65/97-SkillRunner carry assertions for apply-state persistence, queued sections, transcript reactivation, and drawer status axes — every one of those assertions must survive the migration (semantics, not source shape).
- [ ] 3.2 New `addon/content/sidebar/skillrunner.html` loading `acp-child.bundle.js` with `data-source="skillrunner"`.
- [ ] 3.3 Shell (`assistantWorkspaceShell.js`): point the skillrunner frame at the new page, route `skillrunner` publications to it, switch `bridgeKeyForTab`/`messageTypeForTab` to the shared child channel, delete the legacy snapshot cache/forward.
- [ ] 3.4 Child (`assistantWorkspaceAcpChild.js`): skillrunner branches in `childSource()`, `validPublicationEnvelope`, `canonicalActionOwner`; extend `ContextDrawerRegion` for Running/Completed task-group navigation; reuse existing region components otherwise.
- [ ] 3.5 Sidebar: stop publishing `CHILD_SNAPSHOT` for skillrunner and route child actions through the typed registry; keep every user-visible behavior (optimistic selection, history limit + truncation notice, waiting-auth, auto-reply) unchanged.

## 4. Legacy Deletion

- [ ] 4.1 Delete `src/sidebar/runDialog.js`, `runDialogApp.js`, `chatThinkingCore.js`, `addon/content/sidebar/run-dialog.html`, and the run-dialog esbuild entry; delete the SkillRunner branches of `assistantPanelModel.js` / `assistantPanelRenderer.js` and `adaptLegacyTranscriptItem`.
- [ ] 4.2 Delete the push plane in `skillRunnerRunDialog.ts` (`buildRunWorkspaceSnapshot`, decorated snapshot, `pushSnapshot`/`CHILD_SNAPSHOT`, snapshot self-check) and `src/shared/skillRunnerSnapshotContract.ts`; delete `openSkillRunnerRunDialog`, `hostMode: "dialog"`, `resolveRunDialogPageUrl`/`createRunDialogFrame`, and the two `deprecated/` call sites.
- [ ] 4.3 Consolidate markdown-it into one shared sidebar parser module (singleton); the child consumes it.
- [ ] 4.4 Test cleanup: delete 191 and the chat-thinking-core test (84); update or delete 65/69/76/83/94/95 as their locked code moves; update `test/zotero` live-suite references.

## 5. Documentation And Gates

- [ ] 5.1 `AGENTS.md`: extend the cold-mirror/LRU hard-constraint wording with the skillrunner owner rule (request id) and note SkillRunner serves pages from the bounded in-memory mirror without a cold LRU layer; behavior invariants unchanged.
- [ ] 5.2 Append Phase 3 implementation notes to `artifact/assistant-workspace-refactor-plan-20260718.md`.
- [ ] 5.3 `openspec validate 2026-07-21-assistant-workspace-skillrunner-convergence --strict`.
- [ ] 5.4 `npm run build` (help-docs + scaffold + both `tsc --noEmit` programs).
- [ ] 5.5 Focused suites green: 97 / 184 / 190 / 192 + the rewritten 71 + the new skillrunner surface test + the acp family; plus `npm run test:node:core`.
- [ ] 5.6 `npm run lint:check`, `npm run check:localization-governance`, `npm run check:help-docs`, `npm run check:ssot-invariants`.
- [ ] 5.7 `npm run test:lite` Zotero mock harness smoke; manual Zotero 7/9 smoke recorded as a manual item.
- [ ] 5.8 Acceptance pass against `artifact/assistant-workspace-user-behavior-analysis-20260725.md` §6/§8.7 (seven lifecycle states, auth hint suite, revision entries, auto-reply/control indicators, backend-unreachable drawer); the run-switch owner-first change is recorded as the single sanctioned perceptible difference per Decision 10.
