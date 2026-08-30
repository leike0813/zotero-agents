Implementation baseline: `4dbddc24e884921262c559428bf851db5eadf2d7`. Begin only after changes 01 through 07 are complete and verified.

## 1. Prerequisite and Deletion Ledger

- [x] 1.1 Verify completion evidence for `01-establish-workflow-host-v12-contract-foundation` through `07-add-workflow-host-synthesis-facade`, record each focused gate result, and stop if any owner contract or implementation remains partial.
- [x] 1.2 Record the exact baseline-B file inventory and approved public deletion ledger: `items`, `prefs`, `parents`, generic `tags`, generic `collections`, `command`, legacy `literature`, `items.getAll`, v11 operation aliases, flat Synthesis aliases, `runtime.zotero`, `runtime.handlers`, host-capable `runtime.helpers`, hook-visible `IOUtils`, and direct clipboard access.
- [x] 1.3 Confirm `02p-consolidate-platform-subprocess-one-shot-seam` status for the overall runtime-adaptation report without adding subprocess to the v12 public dependency chain or manifest.

## 2. Exact Contract Tests

- [x] 2.1 Extend `test/node/core/187-workflow-host-contract-governance.test.ts` with failing exact 23-top-level/21-module/87-callable, recursive nested, version, interaction-mode, candidate type, unique manifest, and duplicate/unresolved alias cases.
- [x] 2.2 Add failing side-by-side interactive/non-interactive tests proving identical shape and stable deny behavior, including present-but-unavailable filesystem/Synthesis members.
- [x] 2.3 Add failing package and static-governance scans for exact v12 guard and every raw/legacy escape hatch across official built-in packages and hook scopes; record baseline findings before migration.

## 3. Atomic V12 Identity and Composition

- [x] 3.1 Replace candidate/current identity in `src/workflows/workflowHostContract.ts` with the single readonly nested v12 manifest and bidirectional type checks; verify 23/21/87 metrics and version 12.
- [x] 3.2 Finalize `WorkflowHostApiV12` and its exact member signatures in `src/workflows/types.ts`, removing optional `resources`/`synthesis`, raw refs, duplicate public declarations, and legacy public member types; verify TypeScript exactness.
- [x] 3.3 Refactor `src/workflows/hostApi.ts` into explicit owner-member composition with interactive adapters and non-interactive deny adapters; verify no spread, proxy, catalog, whole-Broker alias, cached runtime object, or domain implementation remains.

## 4. Runtime and Loader Hard Cut

- [x] 4.1 Update `src/workflows/runtime.ts` and `src/workflows/loader.ts` to inject only the closed v12 host, pure package helpers, and declared context; remove raw Zotero, handlers, IOUtils, direct clipboard, and host-capable helper injection.
- [x] 4.2 Migrate loader/runtime diagnostics, input planning, debug probe, and Host Bridge workflow-control/resource adapters to the canonical identity owner; verify no second version constant or member allowlist remains.
- [x] 4.3 Update `workflows_builtin/literature-workbench-package/lib/runtime.mjs` and package copies from `[2,11]` to exact v12; verify v12 acceptance and v11 rejection.

## 5. Built-In Consumer Migration

- [x] 5.1 Migrate literature-workbench library/context/navigation/metadata/bibliography consumers to named v12 reads and grouped result envelopes; verify their focused workflow tests pass.
- [x] 5.2 Migrate literature-workbench item/collection/note/attachment/status consumers to canonical mutation/named module results; verify partial diagnostics preserve primary workflow products.
- [x] 5.3 Bind the grouped audit identity resolver from trusted package/workflow content facts, then migrate tag-auditor/regulator/bootstrapper and `workflows_builtin/synthesis-layer/**` to grouped Synthesis, completed traversal evidence, audit runs, and receipt acknowledgement; verify complete and incomplete audit, concurrent promotion, confirmed and unchanged acknowledgement, mismatched or failed receipt, old-process receipt, audited-revision mismatch, and newer-snapshot race cases in the tag and Synthesis workflow suites.
- [x] 5.4 Migrate Research Bundle, file/archive/resources, MinerU, workflow-debug-probe, and all workflow test helpers to v12; verify package tests contain no raw orchestration or compatibility branch.

## 6. Approved Deletions

- [x] 6.1 Remove the approved legacy public members, aliases, handler spreads, injected globals, and dead compatibility code only after all official consumers pass; verify each ledger entry is absent and no unapproved symbol/file is deleted.
- [x] 6.2 Delete shallow tests that only assert removed aliases or empty command behavior after stable v12 interface tests replace them; verify no user-observable behavior coverage is lost.
- [x] 6.3 Run AST/import/package governance and verify zero raw escape hatches, zero flat Synthesis names in `WorkflowHostApiV12`, official consumers, and the code-native manifest, zero v2-v11 guards, zero implicit Broker projections, and exactly one runtime manifest. Internal native legacy routes retained outside the v12 projection are not candidate aliases.

## 7. Specs and Documentation

- [x] 7.1 Synchronize the canonical `workflow-host-api-v12` spec, affected owner delta specs, workflow manifests, and package guards with the implemented surface; verify OpenSpec strict validation and built-in manifest checks pass.
- [x] 7.2 Update `doc/components/workflows.md`, `doc/components/zotero-host-capability-broker-ssot.md`, `doc/components/workflow-hook-helpers.md`, and other directly affected source docs to current-state v12 wording; verify documentation version/owner governance.
- [x] 7.3 Regenerate embedded help only through its owner pipeline if source documentation requires it; verify generated drift checks and never edit `addon/content/help-docs/**` directly.

## 8. Final Validation

- [x] 8.1 Run all focused contract, Broker, runtime, library, snapshot, mutation, research, Synthesis, and built-in workflow suites and resolve task-scoped failures.
- [x] 8.2 Run `npm run test:node:core`, `npm run test:node:workflow`, `npm run test:zotero:core`, `npm run test:zotero:workflow`, `npm run test:synthesis:invariants`, `npm run check:builtin-workflow-manifest`, `npm run lint:check`, `npm run build`, and `npm run test:gate:pr`; record pass/fail/not-run with causes.
- [x] 8.3 Run `openspec validate harden-workflow-host-api-v12 --strict --no-interactive` and OpenSpec verification against the architecture record; verify manifest, DTO/error closure, owner seams, deletion ledger, deferred list, and implementation are coherent.
- [x] 8.4 Produce the final completion report confirming v12 atomic activation, no compatibility path, 23/21/87 conformance, zero bypass findings, all owner gates, and the separate subprocess companion status.

## Implementation Evidence

### Prerequisite owner gates and subprocess companion

- Fixed implementation baseline: `4dbddc24e884921262c559428bf851db5eadf2d7`; verified integration HEAD before activation: `2ee8788d54ccf899832d05e1dec385239354f371`.
- `01` contract foundation, `02` runtime adaptation, and `03` live reads: 123 passing, 10 Zotero/runtime-only pending.
- `04` full-library snapshot: 62 passing.
- `05` mutation authority and `06` research product I/O: 148 passing, 7 Zotero/runtime-only pending.
- `07` grouped Synthesis facade plus the independent `02p` subprocess companion: 242 passing.
- The archived prerequisite changes have every task checked. The later `complete-workflow-host-v12-leaf-owners` change closed the previously recorded prepared-image lifecycle and bibliography-owner gaps without activating v12. The current-HEAD focused owner rerun passed 147 tests with zero failures or pending cases across contract governance, prepared images, Broker mutations/library/snapshot/bibliography, runtime platform services, and Research Bundle behavior. A shared runtime-directory regression introduced after owner completion was fixed at the `runtimePersistence` seam before activation and its focused Research Bundle/runtime gates passed 69 tests.
- `02p` remains plugin-internal. No subprocess member or dependency is approved for the Workflow Host v12 manifest.

### Baseline-B approved deletion inventory

The inventory below is fixed to baseline `4dbddc24e884921262c559428bf851db5eadf2d7` and names production definitions plus official built-in consumers. Test-only fixtures are governed by tasks 2.3 and 6.2 and are not deletion authority.

- Contract/composition/runtime owners: `src/workflows/types.ts`, `src/workflows/hostApi.ts`, `src/workflows/workflowHostContract.ts`, `src/workflows/runtime.ts`, `src/workflows/loader.ts`, `src/workflows/helpers.ts`, `src/workflows/workflowInputPlanning.ts`, `src/handlers/index.ts`.
- `items` and `items.getAll`: `src/workflows/types.ts`, `src/workflows/hostApi.ts`, `src/workflows/helpers.ts`, `src/workflows/runtime.ts`; `workflows_builtin/literature-workbench-package/add-digest-representative-image/hooks/applyResult.mjs`, `collection-collector/hooks/applyResult.mjs`, `debug-migrate-note-payloads/hooks/applyResult.mjs`, `debug-note-artifact-inspector/hooks/applyResult.mjs`, `lib/bundleBibliography.mjs`, `lib/embeddedPayloadAttachments.mjs`, `lib/importSchemas.mjs`, `lib/literatureBundle.mjs`, `lib/literatureDigestNotes.mjs`, `lib/metadataCurator.mjs`, `lib/noteEmbeddedImages.mjs`, `lib/representativeImage.mjs`, `lib/researchBundle.mjs`, `literature-explainer/hooks/applyResult.mjs`, and `tag-auditor/hooks/applyResult.mjs`.
- `prefs`: `src/workflows/types.ts`, `src/workflows/hostApi.ts`; official consumer `workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs` (through its runtime fixture contract).
- `parents`: `src/workflows/types.ts`, `src/workflows/hostApi.ts`, `src/workflows/runtime.ts`, `src/workflows/workflowInputPlanning.ts`; `workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs`, `lib/literatureBundle.mjs`, and `lib/literatureScoreNote.mjs`.
- Generic `tags`: `src/workflows/types.ts`, `src/workflows/hostApi.ts`; `workflows_builtin/literature-workbench-package/tag-auditor/hooks/applyResult.mjs` and `tag-regulator/hooks/applyResult.mjs`. Domain payload fields named `tags` and grouped `synthesis.tags` are outside this deletion.
- Generic `collections`: `src/workflows/types.ts`, `src/workflows/hostApi.ts`, `src/handlers/index.ts`; `workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs`. Library result fields named `collections` are outside this deletion.
- `command`: `src/workflows/types.ts`, `src/workflows/hostApi.ts`, `src/handlers/index.ts`. There is no official production workflow caller; only the empty handler and shallow tests are approved for deletion.
- Legacy `literature`: no baseline production definition or official consumer remains. The zero-entry is retained in the ledger so it cannot be reintroduced during activation.
- V11 operation aliases: the Workflow projection in `src/workflows/types.ts` and `src/workflows/hostApi.ts` accepts the handler-shaped operations `item.updateFields`, `item.addTags`, `item.removeTags`, `item.attachFile`, `note.createChild`, `note.update`, `note.upsertPayload`, `literature.ingest`, `collection.create`, `collection.addItems`, and `collection.removeItems`. Their Workflow aliases are removed; `ZoteroHostCapabilityBroker.legacyMutations` and Host Bridge routes remain internal/native compatibility seams outside the v12 projection.
- Flat Synthesis aliases: `src/workflows/types.ts`, `src/workflows/hostApi.ts`; `workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs`, `lib/researchBundle.mjs`, `tag-auditor/hooks/applyResult.mjs`, `tag-bootstrapper/hooks/applyResult.mjs`, `tag-regulator/hooks/applyResult.mjs`, `lib/tagRegulatorRequest.mjs`, and `lib/literatureDigestSidecar.mjs`; `workflows_builtin/synthesis-layer/hooks/applyTopicPlanResult.mjs` and `applyTopicSynthesisResult.mjs`. Private full-client/native method names remain outside the public projection unless a separate owner task removes them.
- `runtime.zotero`: `src/workflows/runtime.ts`, `src/workflows/workflowInputPlanning.ts`; `workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs` and `literature-metadata-curator/hooks/preflight.mjs`.
- `runtime.handlers`: `src/workflows/runtime.ts`; `workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs`, `workflows_builtin/mineru/hooks/applyResult.mjs`, and `workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs` plus `buildDebugApplyContractRequest.mjs`.
- Host-capable `runtime.helpers`: `src/workflows/runtime.ts`, `src/workflows/workflowInputPlanning.ts`; official consumers under `workflows_builtin/literature-workbench-package/` in debug digest/payload hooks, import-notes, deep-reading/digest/reference/tag-regulator/translator helper modules and hooks, plus `workflows_builtin/mineru/**` and `workflows_builtin/workflow-debug-probe/**`. Pure package-local helpers remain allowed after callers stop receiving the runtime bag.
- Hook-visible `IOUtils`: injection owner `src/workflows/loader.ts`; baseline infrastructure references also exist in `src/workflows/packageHookBundler.ts` and `src/workflows/zipBundleReader.ts` but are not hook-scope members. Official hook consumers are `workflows_builtin/mineru/hooks/applyResult.mjs` and `workflows_builtin/mineru/lib/pdfSplitPlan.mjs`.
- Direct clipboard access: `workflows_builtin/literature-workbench-package/lib/clipboard.mjs`. It migrates to `hostApi.clipboard`; unrelated application UI clipboard use is outside the Workflow consumer ledger.

No whole-file deletion is approved by this ledger. Each entry authorizes only the named public member, alias, injection, empty handler, or now-shallow test after its stable replacement gate passes.

### V12 governance red baseline

- The exact manifest gate initially failed because no production `WORKFLOW_HOST_API_MANIFEST` existed. The implemented readonly manifest now measures 23 top-level keys, 21 modules, and 87 callable paths; metadata value checks, recursive drift facts, a single-definition AST check, DTO alias resolution, and bidirectional TypeScript shape exactness are active.
- The side-by-side production projection gate remains red at the start of task 3: current interactive/non-interactive projections do not conform to the v12 manifest or stable `interaction_required` deny contract.
- The official built-in scan found 40 JavaScript/MJS files with at least one approved legacy/raw/flat-Synthesis escape hatch. The literature-workbench package guard still accepts a range rather than exact v12. These findings are the migration baseline for tasks 4–6.

### Host Bridge semantic-surface baseline

- Review baseline: `4dbddc24e884921262c559428bf851db5eadf2d7`; pre-edit repository HEAD: `dbd9f8a49e5aa135776ac576784cbff009dd8986`.
- Explicit deletion inventory for the `library snapshot` command-contract alignment: none. No existing Host Bridge instruction is authorized for deletion, compression, merger, reordering, or thinner paraphrase.
- Pre-edit materialized metrics (nonblank lines / nonblank characters): Hermes and addon `zotero-bridge-cli/SKILL.md` each `199 / 37246`; Hermes and addon `references/commands/library/snapshot.md` each `1089 / 28655`.
- Fixed-baseline metrics for the same files: each `SKILL.md` `197 / 36065`; each `library/snapshot.md` `533 / 14147`.

### Final validation and completion report

- Focused contract governance passed `14` tests after final formatting. The complete Node core suite passed `3181` tests with `67` runtime-only pending cases and zero failures; the complete Node workflow suite passed `254` tests with `25` pending cases and zero failures. The focused Synthesis invariant gate passed `9` tests.
- `npx tsc --noEmit`, `npm run check:builtin-workflow-manifest`, `npm run lint:check`, `npm run build`, Host Bridge content checking, Host Bridge review-mirror checking, and the fixed-baseline Host Bridge package-depth gate passed. Package-depth output contains only pre-existing advisory warnings for unchanged command cards; the changed snapshot card remains above both fixed-baseline and relative-depth floors.
- `npm run test:zotero:core` was attempted twice and `npm run test:zotero:workflow` once. All three built the test plugin successfully, then failed before loading any test because the local Zotero process never accepted the scaffold connection (`ECONNREFUSED` on three independently allocated loopback ports). These are environment failures, not test assertion failures.
- `npm run test:gate:pr` passed localization governance, SSOT invariants, Host Bridge content, native worker-transfer parity, the Rust sidecar build, and all three Synthesis native Stage 1 shards. Its final Zotero lite stage stopped at the same pre-test loopback `ECONNREFUSED`, so the aggregate gate is recorded failed for the known local GUI-host condition.
- `openspec validate harden-workflow-host-api-v12 --strict --no-interactive` passed. OpenSpec reports all planning artifacts complete; final architecture review confirms the single v12 manifest, strict DTO/error closure, eight explicit leaf owners, the approved deletion ledger, and the implementation are coherent.
- Atomic activation is complete at version `12`: exactly `23` top-level keys, `21` modules, and `87` callable paths. Interactive and non-interactive projections have identical shape; official built-ins accept exact v12 and reject v11. Governance findings are zero for raw host escape hatches, flat public Synthesis aliases, v2-v11 guards, implicit Broker projection, duplicate runtime manifests, and unapproved deletions.
- The architecture deferred inventory remains outside v12: symmetric related-item high-level mutation, item/note/attachment restore, collection tree/detail/children, typed MIME clipboard, final legacy TypeScript `SynthesisService` deletion, and Host Bridge/MCP exposure for new members other than full-library snapshot. The `02p` subprocess companion remains plugin-internal and contributes no public Workflow Host member or dependency.
- Host Bridge post-render materialized metrics (nonblank instruction lines / normalized nonblank characters) are `199 / 37246` for each CLI `SKILL.md` and `1094 / 28869` for each `library/snapshot.md`. Semantic parity counts are: unmapped `0`, downgraded `0`, unauthorized dropped `0`, intra-package duplicate `0`; the approved deletion inventory remains empty.
