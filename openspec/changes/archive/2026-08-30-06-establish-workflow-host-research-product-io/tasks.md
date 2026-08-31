Implementation baseline: `4dbddc24e884921262c559428bf851db5eadf2d7`. Apply after contract foundation and `02-deepen-workflow-host-runtime-adaptation-v12`.

## 1. Deep Module Tests

- [x] 1.1 Extend `test/core/194-research-bundle-service.test.ts` with failing immutable-resource, source-graph, explicit target, SCC, dependency, relation, partial-success, cancel, compensation, unknown, repair, and restart cases.
- [x] 1.2 Extend `test/core/91-workflow-host-api-archive.test.ts` and `test/core/174-workflow-archive-zotero-runtime.test.ts` with failing file/archive bounds, atomic write, extraction lifetime, cleanup, and runtime-persistence ownership cases.
- [x] 1.3 Extend workflow resource tests and `test/workflow-literature-workbench-package/45-workflow-note-import-export.test.ts`, `47-workflow-literature-bundle.test.ts`, and `48-workflow-research-bundle.test.ts` with failing materialization/resolution, allocation/publication, remote-locality, and Product partial-outcome cases.

## 2. File Archive and Resource Owners

- [x] 2.1 Complete v12 file operations in the owned workflow file module and `src/workflows/workflowInputMaterialization.ts`, delegating ordinary I/O to runtime persistence; verify strict path, bytes/text, stat/list/move/remove, temp, picker, and materialization tests pass.
- [x] 2.2 Deepen `src/workflows/archive.ts` with bounded measurement, atomic ZIP write, scoped extraction, callback settlement, and cleanup while retaining native ZIP internals; verify paths become invalid after callback exit.
- [x] 2.3 Deepen `src/modules/hostBridgeWorkflowResources.ts` and Workflow resource adapters with run/slot-scoped input handles, verified ref resolution, local-file materialization, output allocation, publication, listing, retention, and cleanup; verify callback-local paths are consumed before settlement and remote outputs never expose local paths.

## 3. Research Materialization

- [x] 3.1 Refactor `src/modules/researchBundleService.ts` so the pre-bound materializer owns canonical paper-ref normalization, order/deduplication, fixed artifact selection, source graph validation, immutable resource staging, and closed issues; verify direct and Workflow materialization tests pass.
- [x] 3.2 Update `src/modules/synthesisClient/workflowHostClient.ts` and canonical contract imports so artifact reads resolve per invocation and no cached Synthesis/runtime instance is retained; verify late-binding tests pass.

## 4. Graph Import

- [x] 4.1 Implement complete request validation, explicit create/existing mapping, graph normalization, SCC computation, and dependency scheduling before Host effects; verify invalid, over-limit, heuristic-target, and dependency tests fail closed.
- [x] 4.2 Implement group staging, target creation/reuse, resource installation, late relation binding, final verification, and canonical receipt/attempt capture; verify independent groups may commit while one failed group remains consistent.
- [x] 4.3 Implement cancellation and compensation precedence, including unknown and repair-required evidence, without process-restart resume; verify residual effects and request-order results are deterministic.

## 5. Consumer Migration

- [x] 5.1 Prepare explicit `file`, `archive`, `resources`, and `researchBundles` adapters in `src/workflows/hostApi.ts` and DTOs in `src/workflows/types.ts` without activating v12; verify current v11 shape remains stable.
- [x] 5.2 Migrate `workflows_builtin/literature-workbench-package/lib/researchBundle.mjs`, `literatureBundle.mjs`, `zipStore.mjs`, `remote.mjs`, related hooks, and MinerU consumers to the deep modules; verify workflow package tests pass without raw graph orchestration.
- [x] 5.3 Keep direct paper/Topic selection and manifest semantics unchanged while sharing materialization/archive owners; verify existing direct-export tests pass.

## 6. Completion

- [x] 6.1 Run research service, archive, resources, direct export, literature-workbench, and MinerU suites, then `npm run test:node:core`, `npm run test:node:workflow`, `npm run check:builtin-workflow-manifest`, `npm run build`, lint checks, and strict OpenSpec validation; record all results.
- [x] 6.2 Verify no local path entered remote/durable identity, no sequential low-level import facade, no heuristic mapping, no cross-process resume, no second filesystem selector, and no premature v12 activation entered the diff.

Validation record (2026-08-30):

- Focused file/archive/resource/research/workflow regression suite: 272 passing, 8 Zotero-runtime-only pending.
- Full workflow suite: 256 passing, 25 pending.
- Full core suite: 3164 passing, 67 pending, 6 failing. The Workflow file regression was fixed and passed its focused rerun; the command-reference timeout passed in isolation. Four independently reproducible failures remain in pre-existing Host Bridge `library snapshot` fixtures/collector input and the Synthesis cross-language corpus count; none of their owners are changed by this change.
- `npm run build`, `npm run lint:check`, both TypeScript checks, `npm run check:builtin-workflow-manifest`, `git diff --check`, and strict validation of this change and `harden-workflow-host-api-v12`: passing.
- Static consumer scans found no raw filesystem selector, sequential Zotero graph mutation facade, or v12 activation in the migrated paths.
