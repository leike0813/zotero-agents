# Proposal

## Why

`diagnose-windows-synthesis-sidecar-launch-failure` classified the Windows System E2E failure: the
compatibility layout hands the plugin a sidecar session root of 304 characters (Zotero 7 and 9) and
305 (Zotero 10) on the CI runner, the plugin's `ensureRuntimeDirectory` reaches `nsIFile.create`, and
Windows refuses the path with `NS_ERROR_FILE_NAME_TOO_LONG` (`0x80520011`). Four identical retries
later the supervisor fuses with `sidecar_crash_loop_fused` and reports `[Exception...`, and no Windows
release cell can be promoted.

Nothing in the plugin, the sidecar binary, or the bundle is wrong: the run layout nests the plugin's
data root two 36-character UUIDs deep inside a runner temp directory, which leaves the session root —
not any file the plugin controls — past the 260-character limit. This change removes that depth.

## What Changes

- Replace the 36-character `randomUUID()` suffix in the compatibility run layout with an 8-character
  token. Both the cell level and the domain level use it, which removes 56 characters.
- Stop handing the plugin a data root the persistence layer then repeats: the compatibility worker
  passes the run segment root as `ZOTERO_SKILLS_RUNTIME_ROOT` instead of its `runtime` directory, so
  the session path no longer contains `\runtime\runtime`. The runtime-evidence collector reads the
  same root, which removes 8 more characters.
- Drop the `-<mode>-<suite>` suffix from the cell directory label. The compatibility receipt and the
  uploaded artifact name already carry mode and suite, and the label is the last thing worth trading
  for path budget, which removes 14 more characters.
- Give the System E2E test seam an explicit checkpoint directory. It was derived from the session root,
  which put the checkpoint files 50 characters deeper than anything the launch writes; the launch
  config now carries an optional `testCheckpointRoot` that the plugin sets for such a run, and the
  sidecar falls back to the session root when it is absent.
- Pin a path budget with a test: for the deepest Windows target and a CI-shaped run root, the sidecar
  session root, the files the launch writes inside it, and the deepest test-seam checkpoint file must
  all stay under the limit with headroom. That test fails on the current layout, which is what makes
  this class of failure impossible to reintroduce silently.

Measured result: the session root goes from 305 to 227 characters, `config.json` from 317 to 239,
`discovery.json` from 320 to 242, and the deepest checkpoint file from 279 to about 131.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This changes the compatibility harness layout and adds a harness test. No product behavior and
no requirement changes, so it opts out of delta specs via `skip_specs: true` in `.openspec.yaml`.

## Impact

- Affected: `createRunLayout` and the compatibility worker in `scripts/`, the runtime-evidence
  collector's root, and the run-layout tests. Compatibility artifact paths and the receipt's `runId`
  value change shape; `runId` is not part of a cell's calibration identity, so no calibration round is
  invalidated.
- Not affected: plugin behavior, sidecar behavior, blocking lanes, and the set of planned cells.
- Precondition: `diagnose-windows-synthesis-sidecar-launch-failure` has classified the failure, and
  `04-wire-and-calibrate-phase1-system-e2e-ci` owns the Windows promotion that stays blocked until
  this lands and `CG-02` evidence exists.
