Implementation baseline: `4dbddc24e884921262c559428bf851db5eadf2d7`. Apply after `01-establish-workflow-host-v12-contract-foundation`.

## 1. Owner Interface Tests

- [x] 1.1 Extend `test/core/108-runtime-persistence-governance.test.ts` with failing strict/tolerant, unavailable, atomic write/move/remove, stat/list/directory/temp-path, Unicode append, and per-call late-binding cases; verify each failure names missing owner behavior rather than caller internals.
- [x] 1.2 Extend `test/core/52-runtime-bridge.test.ts`, `test/core/90-workflow-host-api-file-picker.test.ts`, and `test/core/165-runtime-platform-services.zotero.test.ts` with failing candidate isolation, live/closed parent, native/toolkit, filters, cancel/empty/multi-selection, feature-detection, and per-call late-binding cases.
- [x] 1.3 Add a governance test inventorying production ordinary-I/O selectors and the closed native-workload allowlist; verify baseline unauthorized findings are explicit before migration.

## 2. Runtime Persistence Owner

- [x] 2.1 Deepen `src/modules/runtimePersistence.ts` with the minimum strict and tolerant ordinary-I/O operations used by current callers, sharing late-bound adapters but preserving failure policy; verify the runtime-persistence focused tests pass.
- [x] 2.2 Implement atomic and Unicode-sensitive guarantees through the owner and keep ZIP, SQLite, script-loader, streaming, picker, attachment, and raw-diagnostic native objects out of its interface; verify the allowlist test maps every exception to one owner and stable test.

## 3. Runtime Bridge and Picker

- [x] 3.1 Consolidate general global/Zotero/addon/toolkit/Window candidate resolution in `src/utils/runtimeBridge.ts`, including override and failed-candidate isolation; verify bridge tests pass without version-string dispatch.
- [x] 3.2 Refactor `src/platform/filePicker.ts` to consume current bridge candidates and own picker parent policy, native/toolkit adapters, filters, and result normalization; verify picker tests never retain a Window or constructor across calls.

## 4. Workflow and Runtime Caller Migration

- [x] 4.1 Migrate `src/workflows/loader.ts`, `packageHookBundler.ts`, `zipBundleReader.ts`, `workflowInputPlanning.ts`, `archive.ts`, and `workflowInputMaterialization.ts` ordinary I/O to runtime persistence while retaining approved native ZIP/script-loader seams; verify Node and Zotero workflow tests pass.
- [x] 4.2 Migrate `src/modules/workflowRuntime.ts`, `src/modules/workflowExecution/bundleIO.ts`, `builtinWorkflowSync.ts`, `runtimeFileTransfer.ts`, and `hostBridgeProfileStore.ts`; verify their existing lifecycle and persistence tests pass without caller-local selectors.
- [x] 4.3 Migrate `src/modules/skillRunnerLocalRuntimeManager.ts`, `skillRunnerReleaseInstaller.ts`, `src/providers/generic-http/provider.ts`, `src/providers/skillrunner/client.ts`, `windowsCommandResolution.ts`, `src/modules/synthesis/gitExecutableResolver.ts`, and ordinary file branches in `acpTransport.ts`; verify SkillRunner/provider/ACP observable outcomes remain unchanged.
- [x] 4.4 Migrate runtime/Window callers including `src/modules/acpContextBuilder.ts`, `src/modules/selectionSample.ts`, and `src/workflows/workflowNoteImagePreparation.ts`; verify `test/core/90-workflow-note-image-preparation.test.ts` and relevant UI-host tests pass with invocation-late candidates.

## 5. Approved Deletions and Governance

- [x] 5.1 Remove `runtimeFileExists`, `runtimeReadTextFile`, and `runtimeRemoveFile` from `src/utils/runtimeCompatibility.ts` plus caller-local equivalent filesystem selectors after all callers migrate; verify TypeScript and `rg` find no approved symbol use in production.
- [x] 5.2 Delete only tests that assert shallow helper existence, re-export identity, or internal fallback order after owner-interface coverage exists; verify no stable observable behavior test is lost.
- [x] 5.3 Run the ordinary-I/O and resolver governance scans and verify unauthorized count is zero, every native allowlist entry has one owner/test, and `src/workflows/hostApi.ts` public shape/version is unchanged.

## 6. Completion

- [x] 6.1 Run the focused runtime, bridge, picker, note-image, stored-attachment, archive, platform, and `test/node/core/130-zotero9-compatibility.test.ts` suites, then `npm run test:node:core`, `npm run test:node:workflow`, `npm run build`, lint checks, and strict OpenSpec validation; record all results.
