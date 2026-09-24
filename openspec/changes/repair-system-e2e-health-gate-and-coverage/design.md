# Design

## Context

The Phase 1 System E2E suite measures a real Zotero host, its plugin, and a current-source Synthesis
sidecar. Its health gate is the fail-closed leak detector for that runtime, and the Windows cells
carry the same duty for the release gate. The review of `1a35f4b2..11a40626` found the gate failing
open on two of its dimensions, one tautological assertion, three single-sample negative assertions,
and six cases skipped outside Linux because their process helpers assumed POSIX, so the Windows
cells reported `pending` for half of the `SL`/`PM`/`HB` catalog.

Those cells are blocking release input. Everything this change touches is therefore read through
real Windows runs rather than by inspection: fifteen weekly dispatches (`35848097038` …
`35939765551`) were needed before all six cells passed on `a1849277`, and each round's evidence is
recorded in `artifacts/system-e2e-open-issues-20260921.md` §6–§10.

## Goals / Non-Goals

**Goals:**

- Measure the two health dimensions the gate hardcoded, and keep the gate fail-closed on what it
  cannot observe.
- Run the same fifteen catalog cases on Windows as on Linux, through one platform-dispatched
  process seam instead of per-case platform branches.
- Keep the calibration evidence honest: a case that fails, anywhere, must not leave a `complete`
  manifest for its cell.

**Non-Goals:**

- Add a second E2E runner, a runtime scenario registry, or per-platform case copies.
- Change what the release gate publishes, or promote or demote any cell from this change.
- Repair the crash-journal and Zotero 9 classification governance items the review also listed.

## Decisions

### 1. One shared health module instead of two hardcoded observers

`scripts/system-e2e/healthGate.ts` owns the measurement: `undeclaredOperations` counts non-terminal
sidecar operations plus `started` canonical mutation entries minus declared carry-over exemptions,
`managedProcesses` counts alive discovery pids beyond the single ready generation, and a runtime
the gate cannot observe reports `indeterminate` instead of fabricated zeros. Both case files import
it, so a leak cannot be measured differently in two places.

Alternative: keep per-file observers and fix the two fields twice. Rejected because the gate is one
contract with two spellings of the same drift.

### 2. One platform-dispatched process seam, owned by the module

`processIsAlive` and `terminateProcess` dispatch on `detectRuntimePlatform()` and run the Windows
tools through `getWindowsExecutableCandidates` with hidden execution. The bare tool names this
started with reach no execution adapter inside Zotero, so every probe reported a dead process and
every kill was a no-op that looked successful; the durable operation record settled it (PM-02's
entry was created `11:33:39.808` and started `11:34:39.810`, exactly the checkpoint's own 60 s hold
deadline). A tool that cannot execute now raises instead of reporting a dead process.

### 3. A runner-owned launch fault for the pre-ready failure case

SL-02 needs a launch that fails before readiness. Poisoning the database path cannot be
deterministic: the repository file is owned by whichever process holds it, the plugin's own recovery
replaces the poisoned input, and the transient error indicator is gone before the case samples it
(rounds eight to ten). The case therefore arms `extensions.zotero-agents.test.systemE2ELaunchFault`
through the same test-run seam that already carries the sidecar checkpoints;
`setSystemE2ELaunchFault` is honored only inside a System E2E run, and the launch fails with
`invalid_config` at its config-write step before anything is written or spawned.

Alternative: keep moving, renaming, or deleting the poisoned path. Rejected because Windows refuses
each operation while an owner holds the path, and the case then fights the product's recovery
instead of asserting its contract.

### 4. Supervision bounded by failures, not by session age

A ready generation ends the restart episode, so the delay ladder and the fuse count consecutive
failures: four isolated terminations inside one E2E session used to fuse the supervisor mid-suite
and cascade over every later family. Termination codes that describe a live neighbour rather than a
deterministic defect (`production_lock_conflict`) use the same bounded ladder, and a generation
whose exit is observed after the supervisor moved on still cleans its runtime path and discovery,
because a discovery that outlives its process publishes readiness for a dead generation.

Alternative: raise the restart budget or reset it only after a dwell time. Rejected because the E2E
legitimately terminates several young generations in a row; the distinction is failure shape, not
age.

### 5. Evidence that fails closed on a reported case failure

The manifest collector treats a reporter-reported case failure as a failure of the invocation and
keeps it sticky across the HB-03 restart, and `runFamilyLifecycle` records a throwing cleanup as
`family_cleanup_failed` with its message in the archived runner output. A case can otherwise throw
outside every family record — a failing setup, a throwing cleanup — and the resumed invocation's
`end` event would finalize a `complete` manifest with a case missing.

## Risks / Trade-offs

- The Windows cells now execute six more cases, so their runtime grows and their fault surface is
  the whole kill/restart path. Evidence: fifteen dispatch rounds, three of them red on a single
  target, before two consecutive green runs.
- The launch fault is a test-only production seam and the E2E strategy forbids calling test-only
  production APIs; it is deliberately the same class as the sidecar checkpoints the strategy
  already blesses, and it is inert whenever the E2E event URL preference is absent.
- Lengthening the health gate's settle window to one full retry ladder costs up to 60 s per family
  on a genuinely broken runtime. Accepted because the alternative is a false `indeterminate` while
  the runtime is still inside its own recovery budget.

## Migration Plan

No data migration. The unlock, the supervisor semantics, and the manifest rule all take effect with
the plugin build; the promoted Windows release cells keep their promotion and recalibrate on their
next scheduled run, which this change's weekly rounds provide.

## Open Questions

None. The calibration round is recorded in `tasks.md` 5.3.
