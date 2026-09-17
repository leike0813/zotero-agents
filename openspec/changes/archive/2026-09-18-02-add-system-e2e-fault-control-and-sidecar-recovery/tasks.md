# Tasks

## 1. Preconditions

- [x] 1.1 Confirm `01-establish-system-e2e-runner-foundation` is implemented, verified, synchronized, and archived, and stop if it is not: verify with `openspec list` showing no active predecessor change and with the archived change present under `openspec/changes/archive/`
- [x] 1.2 Record the runner contract this change builds on by naming the family lifecycle, Run Manifest, and Suite Health Gate entry points in `tests/zotero/e2e/full` and `scripts/run-zotero-test-with-mock.ts`, and verify the existing `npm run test:zotero:e2e` entry point still resolves

## 2. Generation-scoped Reverse Host binding

- [x] 2.1 Add a failing regression check at the production owner interface: a fake supervisor publishes `ready`, the owner binds that generation's instance ID, the supervisor then leaves `ready`, and the check requires the binding to be revoked; run `tests/synthesis/228-synthesis-production-runtime-supervisor.test.ts` directly because current inventory assigns file 228 to Synthesis native stage 1, and confirm it fails before the fix
- [x] 2.2 Revoke the generation's instance binding in `src/modules/synthesis/production/synthesisProductionOwner.ts` when the observed supervisor snapshot leaves `ready`, keeping the existing post-ready bind ordering in `start()`, and verify task 2.1 now passes
- [x] 2.3 Add a regression check that the replacement generation re-binds its own instance ID after reaching ready and that a call carrying the departed instance ID is rejected as stale by the existing broker check without terminating the current generation; verify the focused owner test directly
- [x] 2.4 Verify no public protocol, DTO, discovery document, or capability catalog gained a fault-control or instance-lifecycle field by inspecting the production owner and endpoint diffs, and confirm the owning supervisor suite still passes with `npm run test:synthesis-native:stage1`
  - Public fault-control surfaces remain unchanged; the Topic discovery contract now uses a strict public candidate DTO, and all three Stage 1 shards pass.

## 3. Test-private one-shot checkpoints

- [x] 3.1 Add a failing check for the Reference paging checkpoint: an armed checkpoint holds the traversal after the first page is served and before the next page is requested, and a second concurrent traversal is not held; run the Reference application tests with `npm run test:synthesis-rust-sidecar` and confirm the check fails first
- [x] 3.2 Implement the Reference paging checkpoint inside the page collection path that owns the traversal, one-shot and scoped to that operation, and verify task 3.1 passes
- [x] 3.3 Add a failing check for the maintenance checkpoint: an armed checkpoint holds the operation after durable insert admission and before worker dispatch, and a later duplicate submission is not held; run the public maintenance owner tests with `npm run test:synthesis-rust-sidecar` and confirm the check fails first
- [x] 3.4 Implement the maintenance checkpoint between the durable insert winner and the worker spawn in the public maintenance owner, one-shot and scoped to that operation, and verify task 3.3 passes
- [x] 3.5 Verify both checkpoints are unarmed by default: run the existing Reference refresh and public maintenance suites with `npm run test:synthesis-rust-sidecar` and confirm paging, admission, dispatch, and terminal publication ordering, latency, and receipts are unchanged
- [x] 3.6 Verify no fault-control surface is reachable publicly: inspect the capability catalog, wire contracts, and CLI/MCP surfaces for any fault or checkpoint entry and confirm none was added

## 4. Formal Scenario Cases

- [x] 4.1 Implement `SL-03` under `tests/zotero/e2e/full`: start through the plugin owner, terminate the ready sidecar process externally, require one new ready generation, retirement of the old identity, and no stale discovery or orphan process; verify with `npm run test:zotero:e2e`
- [x] 4.2 Implement `RH-02`: materialize enough synthetic references to require multiple pages, apply one controlled Host mutation after the first page through the checkpoint, require the whole refresh to fail with the production typed reference-basis outcome and commit no mixed result, then require a fresh-basis retry to succeed; verify with `npm run test:zotero:e2e`
- [x] 4.3 Implement `PM-03`: submit the representative public maintenance operation, kill the process from the post-admission checkpoint, require `restart_reconciliation_failed` with `restart_external_effect_unknown` and no automatic replay, then require the deterministic retry successor to be the only party performing one new effect; verify with `npm run test:zotero:e2e`
- [x] 4.4 Verify every case records typed or public outcomes, lifecycle checkpoints, bounded cleanup, and Suite Health Gate status through the shared Run Manifest, and that an indeterminate cleanup fails the family closed; verify in the produced manifest for the run in tasks 4.1-4.3
- [x] 4.5 Delete the Issue #51 spike artifacts and confirm nothing under `tests/zotero/e2e/full` or `src/` retains a second implementation of fault control or of the recovery fix

## 5. Verification and documentation

- [x] 5.1 Run the focused regression checks and the Rust workspace suite with `npm run test:synthesis-rust-sidecar` and confirm no other synthesis behavior regressed
- [x] 5.2 Run the three cases in one Zotero 10/Linux Committed Seed invocation with `npm run test:zotero:e2e` and confirm the run reaches a terminal manifest with passing health and no orphan process or stale discovery
- [x] 5.3 Update `docs/dev/zotero-e2e.md` with the three case names, the two checkpoints and their one-shot operation-scoped limits, and the requirement that only the manifest carries evidence; verify the documented commands match `package.json`
- [x] 5.4 Confirm the R9 acceptance change is untouched by this change and that no R9 packaging, migration, lock, matrix, or evaluator gate moved into it; verify by inspecting the diff for files under `openspec/changes/complete-synthesis-r9-stage1-acceptance/` and the corresponding acceptance surfaces
- [x] 5.5 Run `openspec validate 02-add-system-e2e-fault-control-and-sidecar-recovery --type change --strict --no-interactive` and confirm the change validates with the single delta capability
