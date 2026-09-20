# Proposal

## Why

Every Windows release System E2E cell still fails before the Synthesis sidecar serves anything, and
the evidence captured so far cannot say why. The per-cell runtime log records
`synthesis-sidecar-runtime / launch / failed` as
`{code: sidecar_crash_loop_fused, lastFailureCode: "[Exception...", restartCount: 4, exitCode: null}`,
while `sidecar-runtime-evidence.json` reports the install present with `missingFiles: 0` and
`sessions: []`. The captured text is the first whitespace-delimited token of the thrown error, which
is not enough to tell a failure that never created the process from one that never reached
discovery, and `exitCode: null` keeps those two cases indistinguishable.

`04-wire-and-calibrate-phase1-system-e2e-ci` promoted seven Linux cells and deliberately added no
product runtime behavior, so its Windows task (6.3) cannot advance until the cause is classified,
and no Windows cell can be promoted on the current evidence. This change produces that
classification; the repair is a separate change.

## What Changes

- Give the System E2E per-cell diagnostics a classification-grade launch-failure record: the failing
  stage (before process creation / at creation / after creation before discovery), the raw error
  name, the platform error number when the thrown error exposes one, and the process exit value
  when the process ever existed.
- Keep the product runtime log as it is. Its details stay business-semantics-only by contract, and
  the richer native detail belongs in the test-only diagnostics artifact.
- Add runner-side tests that pin the three launch outcomes apart, so a future Windows round cannot
  collapse back into `[Exception...`.
- Reproduce at least one Windows E2E cell with the current-source sidecar and record the resulting
  classification as the change's evidence.
- Correct the record: the Windows `behavior` (domain `all`) failures in `ci.yml` are **not** this
  failure. A verified receipt shows `22 passed, 2 failed` with
  `Component returned failure code: 0x80520011 (NS_ERROR_FILE_NAME_TOO_LONG) [nsIFile.create]` and a
  temporary-directory cleanup error `NS_ERROR_FILE_DIR_NOT_EMPTY`. The Windows `xpi-smoke` failure
  reports `host_facts_missing`. Those are separate Windows defects and are out of scope here; they
  are recorded so the two failure families stop being read as one.
- Non-goal: fixing whatever the classification identifies, promoting any Windows cell, and changing
  any blocking lane.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The product runtime log keeps its existing contract, and the System E2E diagnostics artifact
is not governed at field level by any spec requirement. This change adds test tooling and knowledge,
so it opts out of delta specs via `skip_specs: true` in `.openspec.yaml`.

## Impact

- Affected evidence path: the runner-side launch-failure observation and the per-cell
  `artifacts/test-diagnostics/system-e2e/<runId>/` diagnostics that a compatibility cell uploads.
- Affected contract: none for users. The change touches the System E2E harness, not product
  behavior, and adds no blocking placement.
- Depends on `04-wire-and-calibrate-phase1-system-e2e-ci` for the lanes that can produce a Windows
  round with the current-source sidecar: only the release and calibration lanes stage a Windows
  sidecar built from the current source.
- Verified locally on Linux for the process-creation and post-creation outcomes; only a Windows
  round can exercise the remaining one, so the change stays incomplete until such a round exists.
