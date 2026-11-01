# test-suite-gating-strategy Specification

## Purpose

Defines which deterministic and real-host suites block pull requests, releases, and supported compatibility targets, and how each runner derives authoritative test membership.

## Requirements

### Requirement: Pull requests SHALL run both deterministic Node and real-host guards

Pull-request gates SHALL require deterministic Node coverage and the critical real-Zotero guard.

#### Scenario: PR gate

- **WHEN** the pull-request gate runs
- **THEN** governance checks and full-strength Synthesis native stage1 run
- **AND** all regular deterministic Node shards run
- **AND** Zotero `lite` runs
- **AND** failure in any stage blocks the gate

### Requirement: Releases SHALL run the full real-host layer

Release gates SHALL require the complete real-Zotero layer in addition to pull-request coverage.

#### Scenario: Release gate

- **WHEN** the release gate runs
- **THEN** it runs the same checks, full-strength native stage1, and Node layers as the PR gate
- **AND** it runs Zotero `full`
- **AND** `full` includes every `lite` file plus the files under each `full` directory

### Requirement: Default test entrypoint SHALL execute the complete routine suite

`npm test` SHALL run shared governance checks, routine Synthesis native stage1, native Rust tests, all regular Node shards, and the complete real-Zotero layer including System E2E. The routine native stage1 SHALL retain every normal step and omit only the cross-language `--stress` oversized probes. `npm test` SHALL preserve failure exit codes and SHALL NOT invoke live model capture. Explicit Node-only and domain commands SHALL remain available.

`npm run test:deep` SHALL use the same stage membership as `npm test`, restore the cross-language `--stress` probes and complete pressure coverage, and use the same aggregate fail-continue behavior and first-failure exit code. PR/release gates and standalone `npm run test:synthesis-native:stage1` SHALL retain their existing complete native pressure coverage and failure policy.

The routine cross-language checker SHALL receive `--routine` and list probes blocked by its row or byte budget in `structureExecution.deferredToDeep`. Deferred probes SHALL NOT count as covered. Missing seeds, traversal truncation, exhausted verification attempts and other coverage gaps SHALL still fail; deep and PR/release checks SHALL require all structural obligations.

#### Scenario: Complete local test invocation

- **WHEN** a maintainer invokes `npm test`
- **THEN** all routine layers execute through their existing authoritative runners
- **AND** any failed prerequisite or test stage fails the command

#### Scenario: Deep pressure invocation

- **WHEN** a maintainer invokes `npm run test:deep`
- **THEN** the same stages and complete real-Zotero layer run as for `npm test`
- **AND** cross-language oversized stress probes run at their complete intensity
- **AND** failures do not prevent later stages from being attempted

#### Scenario: Caller has live-capture environment

- **WHEN** routine tests inherit live-capture or narrowed test-selection inputs
- **THEN** routine gates select offline peers and their complete intended membership
- **AND** real model credentials are not required

### Requirement: Test membership SHALL have one source of truth

Each test runner SHALL derive membership from one authoritative inventory.

#### Scenario: Node inventory

- **WHEN** Node tests are listed
- **THEN** each regular test is assigned to exactly one ownership shard
- **AND** unassigned or duplicate assignments fail the command

#### Scenario: Zotero inventory

- **WHEN** Zotero tests are selected
- **THEN** membership comes directly from `tests/zotero/{core,ui,workflow}/{lite,full}`
- **AND** aggregate import suites, file allowlists, and title allowlists are not used

### Requirement: Domain commands SHALL follow production ownership

Node domain commands SHALL execute shards grouped by production ownership.

#### Scenario: Node domain command

- **WHEN** `test:node:<domain>` runs
- **THEN** it executes only the shards owned by that production domain
- **AND** a failing shard prints a direct single-shard rerun command

#### Scenario: Native suite is not duplicated

- **WHEN** regular Node shards run in a gate that also runs Synthesis native stage1
- **THEN** native stage1 files are excluded from regular shards

### Requirement: Node execution SHALL use bounded parallelism and retain standalone diagnostics

The Node shard runner SHALL execute shards with bounded parallelism. Its default worker count SHALL be `min(available parallelism, 8)`, or `min(available parallelism, 2)` when CI is detected. `--jobs N` and `ZOTERO_TEST_JOBS` SHALL override the requested count, subject to available parallelism.

A standalone `npm run test:node` invocation SHALL write `summary.json`, `failures.md`, `results/`, and `logs/` under `artifacts/test-diagnostics/node/<run>/`, and SHALL update `artifacts/test-diagnostics/node/latest.json` to identify the most recently started run.

#### Scenario: CI and local defaults

- **WHEN** Node tests run without an explicit worker override
- **THEN** a local run uses at most eight workers constrained by available parallelism
- **AND** a CI run uses at most two workers constrained by available parallelism

#### Scenario: Standalone Node invocation fails

- **WHEN** `npm run test:node` runs independently and a shard fails
- **THEN** its run directory retains structured summaries, failure diagnostics, and logs
- **AND** the process returns a failing exit status

### Requirement: Profiling SHALL expose test and process timing without changing suite membership

`npm test -- --profile [--jobs N]`, `npm run test:deep -- --profile`, and `npm run test:node -- --profile --jobs 1` SHALL write `profile.json`, `profile.md`, and `profile-metadata.json` in the run report directory. Profiles SHALL record Mocha test, hook, and load spans; parent-process stages; and Zotero events and preparation.

CPU and RSS measurements SHALL describe only the recording process and SHALL NOT be represented as process-tree totals. Nested or concurrent durations SHALL NOT be substituted for elapsed wall time.

When `npm test` or `test:deep` profiles Rust tests after the normal suite, those isolated-process samples SHALL be marked supplemental and timed separately. They SHALL NOT be counted as regular `npm test` duration.

#### Scenario: Profile artifacts are inspected

- **WHEN** a supported gate or Node command runs with `--profile`
- **THEN** the three profile artifacts are available in the run report directory
- **AND** per-test, hook, load, process, and Zotero phase evidence remains distinguishable

#### Scenario: Rust supplemental samples are timed

- **WHEN** a full or deep profiled run completes its normal stages
- **THEN** Rust isolated-process samples run as supplemental evidence
- **AND** their durations are reported separately from regular `npm test` timing

### Requirement: Native stage1 SHALL isolate production batches and order producer evidence

Native stage1 production test files SHALL be partitioned into at most the requested worker count of isolated batches with bounded concurrency. Workflow producer runs SHALL execute after aggregate validation evidence from the non-producer runs is available. A verification identity MAY be cached only for its current process scope and SHALL be revalidated before that scope ends.

#### Scenario: Production segment includes workflow producers

- **WHEN** native stage1 runs its production segment
- **THEN** production test files execute with process isolation and bounded concurrency
- **AND** workflow producers run only after aggregate validation evidence is complete
- **AND** a process-scoped identity cache is revalidated when the scope ends

### Requirement: Real-host compatibility SHALL remain blocking on supported targets

Existing supported real-host compatibility targets SHALL remain blocking. Phase 1 System E2E cells SHALL begin non-blocking and SHALL become blocking only through explicit per-cell configuration after three reviewed clean independent rounds for the exact calibration identity. A missing, invalid, mixed-identity, or stale round MUST NOT authorize Phase 1 promotion. Independently authorized WF cells SHALL follow the required workflow gate policy below without changing Phase 1 identities or promotion records.

#### Scenario: Compatibility matrix

- **WHEN** the compatibility gate runs
- **THEN** existing promoted Zotero 7, 9, and 10 Linux and Windows targets remain blocking
- **AND** unpromoted E2E cells and explicitly informational macOS evidence do not override blocking results

#### Scenario: E2E cell is promoted

- **WHEN** the maintainer has reviewed three qualifying clean manifests and explicitly changes the Phase 1 cell configuration
- **THEN** that cell becomes blocking independently of unrelated cells
- **AND** the evidence remains linked to its calibration identity

#### Scenario: Windows close lifecycle is unresolved

- **WHEN** `CG-02` still crashes, lacks a trustworthy terminal manifest, or has not been classified on the selected Windows target
- **THEN** the affected Windows release E2E cell SHALL NOT be promoted

### Requirement: Workflow business paths SHALL block CI and release gates

WF-01 SHALL be required by local PR/release gates and by independent blocking compatibility cells: Linux Zotero 10 for pull requests, and Linux Zotero 7/9/10 for main and release. This explicitly requested promotion SHALL preserve existing cell identities. Workflow cells SHALL use synthetic offline peers and a current-source real sidecar, and SHALL NOT automatically retry failures.

#### Scenario: Required workflow cell fails

- **WHEN** WF-01 fails, aborts, remains incomplete, or fails cleanup or health
- **THEN** its required job fails and retains the first-attempt Run Manifest
- **AND** release publication cannot proceed on that result

#### Scenario: Workflow cell succeeds

- **WHEN** the workflow cell completes all 20 non-debug workflows
- **THEN** its complete passing Run Manifest and diagnostics are retained
- **AND** no external model or MinerU service is called

#### Scenario: CI has no personal Python environment

- **WHEN** the workflow cell runs on a clean GitHub runner
- **THEN** it uses the prepared declared Skill runtime without a developer-specific home path

### Requirement: Blocking System E2E lanes SHALL NOT auto-retry

Pull-request, main, and release System E2E cells SHALL run once per workflow attempt. A failed, aborted, incomplete, or indeterminate cell SHALL retain that verdict and SHALL NOT automatically rerun.

#### Scenario: Blocking cell fails

- **WHEN** a blocking PR, main, or release E2E cell does not produce a complete passing manifest
- **THEN** the gate SHALL fail with the first attempt's evidence
- **AND** orchestration SHALL NOT create an automatic successor attempt

### Requirement: Weekly orchestration MAY rerun one complete failed cell for diagnosis

Weekly scheduled orchestration MAY rerun a failed cell at most once outside the Zotero runner. The successor SHALL use a fresh profile and new run ID linked to the immutable first attempt, and SHALL rerun the whole cell rather than an individual case. A successor pass SHALL classify the failure as `intermittent`; a successor failure SHALL classify it as `persistent`. Any first-attempt failure SHALL keep the weekly workflow failed.

#### Scenario: Weekly cell fails then passes

- **WHEN** a weekly cell fails its first attempt and its single complete rerun passes
- **THEN** both manifests SHALL remain separately available and linked
- **AND** the cell SHALL be classified `intermittent`
- **AND** the weekly workflow SHALL remain failed

#### Scenario: Weekly cell fails twice

- **WHEN** the first attempt and its single complete rerun fail
- **THEN** the cell SHALL be classified `persistent`
- **AND** no further automatic attempt SHALL run

### Requirement: Zotero full SHALL reuse its invocation build while isolating serial host profiles

`test:zotero:full` SHALL create an invocation-scoped build cache. After a successful preparation of the plugin and current-source sidecar, all Zotero domains SHALL reuse that build; a failed preparation SHALL be retried by a later domain. Core, UI, workflow, and E2E SHALL continue to use independent host processes and profiles in sequence. Each launch SHALL wait for the plugin to reach `initialized` readiness before running tests. Complete membership and failure propagation SHALL be preserved.

#### Scenario: Full execution topology

- **WHEN** `test:zotero:full` runs
- **THEN** core, UI, workflow, and E2E run in separate sequential Zotero host processes with independent profiles
- **AND** core, UI, and workflow load their lite and full directories while E2E loads its full directory
- **AND** all domains reuse the first successful invocation build and current-source sidecar preparation
- **AND** each host waits for `initialized` readiness
- **AND** failure in any process fails the full suite

Current implementation evidence does not constitute real-hardware acceptance: the Zotero topology remains unverified on target hosts, and remote content consistency still blocks end-to-end acceptance. This specification makes no performance-improvement claim from that implementation.
