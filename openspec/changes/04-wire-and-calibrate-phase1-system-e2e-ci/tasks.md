# Tasks

## 1. Enforce the Serial Gate and Repair Compatibility Membership

- [x] 1.1 Confirm `03-implement-phase1-system-e2e-catalog` is implemented, verified, synchronized, and archived before editing implementation files; record the archived change identity in the implementation notes
  - Archived identity: `openspec/changes/archive/2026-09-18-03-implement-phase1-system-e2e-catalog` at commit `f35816231fc90f66106c4a8b98f627b3aa6cdb12`; all archived tasks are complete, verification evidence is recorded there, and the change intentionally has no delta specs to synchronize.
- [x] 1.2 Add failing compatibility-worker contract cases proving direct directory membership for `lite`, `full`, and `e2e`, then remove deleted `suite.test.ts` proxy assumptions and verify complete membership plus failure propagation
- [x] 1.3 Add failing planner/CLI cases for the `e2e` domain before extending domain validation, selection, worker routing, and receipt parsing; verify existing behavior and XPI modes remain unchanged

## 2. Bind Immutable Execution Cells

- [x] 2.1 Add failing plan/receipt cases for lane, exact target, family grouping, runner environment, fixture scale, invocation/profile model, gate state, plugin digest, sidecar fingerprint, and Run Manifest reference, then implement the minimal shared execution-cell fields
- [x] 2.2 Add failing artifact-identity tests, then prepare the plugin once per workflow and current-source sidecar per required target before cells, disable cell-local replacement, and verify pre/post worker fingerprints are identical
- [x] 2.3 Verify each E2E invocation creates a fresh copied profile and consumes complete family groups without file/title allowlists or cross-cell profile sharing

## 3. Wire the Fixed Matrix as Non-Blocking

- [x] 3.1 Add failing planner snapshots/structural assertions for the exact pull-request Zotero 10/Linux `SL+PM` cell, then wire every PR targeting `main` with no path-based skip and verify it begins non-blocking
- [x] 3.2 Add failing planner assertions for Zotero 7/9/10 Linux all-family main cells, then wire them non-blocking and verify each emits its own receipt and manifest
- [x] 3.3 Add failing planner assertions for Zotero 7/9/10 Linux and Windows all-family release cells plus existing macOS Zotero 10 XPI smoke, then wire them before publication and verify tag-bound plugin/sidecar identity checks reject reused main evidence
- [x] 3.4 Add failing planner assertions for weekly release-equivalent health, Zotero 10/Linux stress, and manual Zotero 10/Linux large-gold `RH/PA/PM/CG`, then wire each as non-gating and verify selected large-gold fails when its read-only source is missing or invalid

## 4. Implement Calibration, Grouping, and Promotion

- [x] 4.1 Add failing calibration-validator cases, then require three complete clean manifests from independent workflow runs with matching cell identity and fresh profiles; verify invalid cleanup, health, process, port, lock, or terminal evidence rejects the round
- [x] 4.2 Add failing identity-invalidation cases for target version, runner OS/image, family grouping, fixture scale, sidecar startup model, and invocation/profile model, then verify ordinary product commits and fixture-content revisions do not invalidate calibration by themselves
- [x] 4.3 Add failing grouping cases for the 15/30/45/60/90-minute candidate thresholds, then implement maximum-observed-round evaluation and the family-preserving Synthesis/HB followed by `SL/PM`, `RH/PA/CG`, `HB` split order
- [x] 4.4 Add failing promotion-policy cases, then make promotion an explicit per-cell configuration value and verify no automatic promotion, unrelated-cell dependency, or Windows release promotion while `CG-02` is failing or lacks trustworthy evidence

## 5. Add the Weekly Diagnostic Rerun

- [x] 5.1 Add failing orchestration tests proving only weekly cells can rerun once and only as a complete cell, then implement a fresh-profile successor run with a new run ID and predecessor link outside the Zotero runner
- [x] 5.2 Verify first and second manifests remain immutable and separate, successor pass classifies `intermittent`, successor failure classifies `persistent`, and any first-attempt failure keeps the weekly workflow failed
- [x] 5.3 Add negative tests proving pull-request, main, and release cells never auto-retry after failed, aborted, incomplete, or indeterminate manifests

## 6. Calibrate, Promote, and Verify

- [ ] 6.1 Run three clean independent workflow rounds for every candidate PR cell on its exact identity, retain each manifest, review the observed maximum, and explicitly promote only qualifying cells
  - `pull-request-zotero-10-linux-x64-e2e-sl-pm`: three clean rounds from the `e2e-calibration-pr-*-r9/r10/r11` runs (manifest run ids `4c89cee2`, `befe02dd`, `4c85bf7e`; receipts `passed`, manifests `complete`, 8 family entries, cleanup and health passed), maximum clean round 2.47 min against the 15 min PR threshold. The cell qualified but is **not** promoted: `E2E_PROMOTION_STATE` stays `false` until 6.7 makes the blocking lane able to execute an E2E cell.
- [ ] 6.2 Run and review three clean rounds for every candidate main and release cell, regroup and restart calibration where a threshold is exceeded, and explicitly promote qualifying cells independently
  - main: `main-zotero-{7,9,10}-linux-x64-e2e-sl-rh-pa-pm-cg-hb` each ran three clean rounds (max 3.82 / 3.45 / 3.50 min against the 30 min threshold); release Linux: `release-zotero-{7,9,10}-linux-x64-e2e-sl-rh-pa-pm-cg-hb` each ran three clean rounds (max 3.57 / 3.31 / 3.45 min against the 45 min threshold). All rounds kept one calibration identity (same target, family group, `ubuntu-24.04`, `committed-seed`, `pre-staged-current-source`, `one-fresh-copied-profile-per-invocation`) and produced `complete` manifests with every family, cleanup and health passed. No threshold was exceeded, so no cell was regrouped. All seven cells qualified but none is promoted, for the reason in 6.7.
  - Three Windows release cells remain non-blocking: they fail with `sidecar_crash_loop_fused` and no trustworthy `CG-02` evidence, so they are not promoted.
- [ ] 6.3 Verify all promoted Windows release cells include passing `CG-02` evidence and the recorded Zotero 9 classification; leave any unsupported cell non-blocking
  - No Windows release cell is promoted; the three Windows cells stay `false` in `E2E_PROMOTION_STATE` because their System E2E runs fail and `CG-02` evidence is not trustworthy yet.
  - From the r12 release run (`35456114609`), each Windows cell records `synthesis-sidecar-runtime / launch / failed` as `{code: sidecar_crash_loop_fused, lastFailureCode: "[Exception...", restartCount: 4, exitCode: null}`, while `sidecar-runtime-evidence.json` reports `install.present: true`, `missingFiles: 0` and `sessions: []`. The launch aborts with a host exception before any session exists, which rules out the discovery timeout this cell was previously suspected of.
  - The Windows Run Manifest also lists only `HB-01`/`HB-02` while the runner reported 11 failing cases, so the family record does not yet reflect everything the cell executed.
- [ ] 6.4 Exercise weekly, stress, and manual large-gold triggers and verify they remain non-gating, first-failure preserving, and isolated from release authority
- [x] 6.5 Update compatibility/E2E operator documentation with cell identities, calibration evidence, promotion edits, rerun semantics, and tag-bound release ordering; verify referenced commands and workflow names resolve
- [ ] 6.6 Run planner/worker/receipt tests, workflow static validation, strict OpenSpec validation, and the promoted real-host cells; treat any missing real-machine round as incomplete rather than passing
  - Planner/worker/receipt tests, workflow static validation and strict OpenSpec validation pass. The promoted real-host part is outstanding: with no promoted cell the blocking lanes execute no E2E cell at all, so no real-machine round proves a promoted cell yet.
- [ ] 6.7 Wire the blocking compatibility lanes to the prepared immutable candidate, then verify promoted cells through them
  - `ci.yml` `zotero-compatibility-blocking` and `release.yml` `release-compatibility-blocking` download only `build-result` / `release-candidate`, so they cannot run an E2E cell: `run --domain e2e` requires the staged sidecar plus `compatibility-artifact-identity.json`, which only `test:zotero:compatibility:prepare` produces. The release blocking lane also omits `ZOTERO_COMPAT_FAMILIES` and `ZOTERO_COMPAT_FIXTURE_SCALE`.
  - Consequence withheld promotion: promoting a cell moves it into the blocking matrix, so the first pull request against `main` would fail on `pull-request-zotero-10-linux-x64-e2e-sl-pm` without any real product failure. `system-e2e-evidence.yml` cannot show this because it is calibration-only (`continue-on-error: true`, `ZOTERO_COMPAT_BLOCKING: "false"`), and `ci.yml`/`release.yml` only run on `main` pushes and pull requests.
  - Completion requires the blocking lanes to consume planner output per `matrix.domain`, a failed E2E preparation to fail the gate rather than soften it, and one real `ci.yml` or `release.yml` run showing a promoted cell executed and passing from the prepared candidate.
