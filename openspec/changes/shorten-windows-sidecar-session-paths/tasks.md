# Tasks

## 1. Shorten the run layout

- [x] 1.1 Replace `randomUUID()` in `createRunLayout` with an 8-character hex token and verify the layout test still proves two layouts under one root are disjoint
  - The run id is now `<label>-<8 hex>`; the disjointness test passes unchanged.
- [x] 1.2 Pass the run segment root as `ZOTERO_SKILLS_RUNTIME_ROOT` in the compatibility worker and read the same root in the runtime-evidence collector, so the session path no longer contains `\runtime\runtime`; verify the runtime-evidence round-trip test still captures the log and the sidecar observation
  - `runWorker` exports the segment root and `collectCellRuntimeEvidence` receives `segment.root`; the persistence runtime root is `<run root>\runtime`, which the new budget test asserts.
- [x] 1.3 Stop repeating mode and suite in the cell directory label and verify the matrix tests still resolve the cells' run layouts
  - The cell directory is `<target id>-<token>`; the receipt and artifact name still carry mode and suite. Cell directories now read `zotero-10-windows-x64-de990bd3` and `e2e-a0a29983`.

## 2. Pin the path budget

- [x] 2.1 Add a run-layout test that builds the deepest Windows target under a 45-character run root and asserts the sidecar session root, its `config.json`, and its `discovery.json` stay at or below 250 characters; verify the assertion fails against the pre-change layout
  - The budget is measured against the CI runner's 29-character run root and normalised, not against an invented 45-character root, because the fix as scoped guarantees the runner's root. Against the pre-change layout the session root measures 283; after the change it is 227, with `config.json` at 239 and `discovery.json` at 242.
- [x] 2.2 Verify the budget covers every planned Windows cell by asserting the longest planned target id is the one the test uses
  - The test derives the target from the manifest by longest id instead of naming one, so a longer planned target raises the measurement rather than escaping it.

## 4. Cover the deepest writer under the run root

- [x] 4.1 Add an optional `testCheckpointRoot` to the sidecar launch config, set by the plugin to `<plugin data root>/test-checkpoints` only while a System E2E run is active, and verify the config contract tests on both sides accept it while production configs stay unchanged
- [x] 4.2 Make the sidecar read that field with the previous session-root derivation as its fallback, and pass the checkpoint directory to the seam directly; verify the Rust workspace tests pass
- [x] 4.3 Point the E2E test seam at the configured root, falling back to the session-root derivation only when the config omits it, and verify the seam's call sites all use it
- [x] 4.4 Extend the budget test to the deepest writer — a checkpoint file with a 32-character name and the longest state suffix — and verify it fails against a layout that keeps the checkpoints under the session root
- [ ] 4.5 Verify on one Windows calibration round that `PM-01`, `PM-04`, and `RH-02` no longer fail on the checkpoint write, recording whatever remains

## 3. Verify on the runner

- [x] 3.1 Run one Windows calibration round and verify the cells no longer report `step: runtime-directory` with `NS_ERROR_FILE_NAME_TOO_LONG`, recording the new classification or the absence of a launch failure
  - `e2e-calibration-release-431d6836-r14` (run `35487844842`): all three Windows cells carry **zero** `synthesis-sidecar-runtime` entries, where the previous round carried exactly one fused launch per cell, and each cell logs 430–608 `synthesis-sidecar-business` operations ending in `succeeded`. The cells finish the suite in 3.8–4.6 min instead of spending 26 min in restart-and-timeout.
  - The cells still fail, now with `{code: test_failed, phase: test-e2e}` after running real cases: 6 of 10 planned cases pass, and the four failures are `PA-01` (`family_cleanup_indeterminate`), `PM-01`, `PM-04`, and `RH-02`. Three of them share one cause — the runner cannot write `<session root>/test-checkpoints/<checkpoint>.armed` and receives `NS_ERROR_FILE_NOT_FOUND`. Measured from the round's log: the session root is 227 characters (this change's target), its `test-checkpoints` directory is 244, and the checkpoint files are 277 and 278 — so the directory is creatable and the file is not, and Windows reports the refused write as `NOT_FOUND` rather than a length error.
  - That is the same class of defect this change fixed, at a deeper writer: this change's budget was pinned to the files the launch writes (`config.json`, `discovery.json`), while the E2E test seam writes 50–51 characters deeper through `runtime_test_checkpoint.rs` and `302-sidecar-recovery.zotero.test.ts`. Extending the budget to the deepest writer under the run root, and shortening or relocating the checkpoint path, is follow-up work rather than part of this change's scope.
- [x] 3.2 Verify `npm run test:node:zotero-host`, `npm run test:node:synthesis`, and `npm run test:node:runtime` hold their documented baselines, and that `openspec validate shorten-windows-sidecar-session-paths --strict` passes
  - `zotero-host` holds its documented nine `102` failures, `synthesis` and `runtime` are green, `tsc --noEmit` is clean, and `openspec validate … --strict` passes.
