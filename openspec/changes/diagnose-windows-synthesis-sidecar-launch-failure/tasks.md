# Tasks

## 1. Classification-grade launch-failure record

- [ ] 1.1 Extend the System E2E launch-failure record with the failing stage (`pre-create`, `spawn`, `pre-discovery`), the raw error name, the platform error number when the thrown error exposes one, the exit value when a process existed, and the attempted path length — never the path text; verify with runner-side tests that each field is populated for its own trigger and that no absolute path appears in the serialized record
- [ ] 1.2 Tag each step of `launch()` — runtime-directory creation, install resolution, config write, process spawn — so the stage comes from which step threw; verify by making each step throw in turn through the supervisor's existing test seam and asserting the reported stage
- [ ] 1.3 Leave the product runtime-log entry exactly as change 04 left it (`code`, `lastFailureCode`, `restartCount`, `exitCode`); verify the existing supervisor tests and the `runtime-log-pipeline` contract tests still pass unchanged
- [ ] 1.4 Verify the record survives the trip into the uploaded per-cell diagnostics: extend the runtime-evidence writer's round-trip test so a failure record without a session is still captured

## 2. Classify the Windows failure

- [ ] 2.1 Run one Windows System E2E cell that uses the current-source sidecar (release or calibration lane) and attach the resulting diagnostics record to this change
- [ ] 2.2 Record the classification and state which hypothesis it confirms or refutes; a `pre-create` stage with error number `0x80520011` confirms the path-length arithmetic in `design.md`, and any other combination refutes it
- [ ] 2.3 Verify the three adjacent Windows failures are recorded as separate items and not described as the sidecar launch failure: the `domain all` long-path failure (`0x80520011 [nsIFile.create]`), the `domain all` temporary-directory cleanup failure (`NS_ERROR_FILE_DIR_NOT_EMPTY`), and the `xpi-smoke` failure (`host_facts_missing`)

## 3. Hand-off

- [ ] 3.1 Record the classification in `04-wire-and-calibrate-phase1-system-e2e-ci`'s Windows task so its promotion decision can cite it, and state here whether a repair change is required
- [ ] 3.2 Verify the change's own completion with `openspec validate diagnose-windows-synthesis-sidecar-launch-failure --strict` and the `zotero-host` shard green apart from its documented pre-existing failures
