# Test Suite Governance

## 1. Suite Membership Policy

`lite` policy:

- Must protect PR critical path
- Must prefer deterministic and fast-running tests
- May exclude deep regression cases that do not materially change PR decision quality

`full` policy:

- Must include all `lite` tests
- Acts as the stable real-host CI coverage gate
- Prefers host coverage and repeatability over speed
- Uses sequential multi-process execution for retained Zotero domains when a
  single real-host process would dominate the gate with tail degradation

Guardrail:

- `full` is a strict superset of `lite`

Additional governance dimensions:

- Runtime affinity: `node-only` / `zotero-safe` / `zotero-unsafe`
- Priority: `critical` / `standard`

These dimensions are governance rules and documentation tags, not a new runner mechanism.

## 2. Runtime Affinity Governance

`node-only`:

- package helper tests
- runtime seam tests
- mock-heavy tests
- fake DOM / renderer structure tests

`zotero-safe`:

- safe to run in real Zotero runtime
- no real editor / picker / dialog opening
- no reliance on single-realm-only mock injection

`zotero-unsafe`:

- can open real editor / file picker / dialog
- or depends on brittle multi-realm injection / long UI async chains

Hard rule:

- Tests that may open real editor, file picker, or dialog must not run in Zotero routine suites
- They must either be skipped in Zotero or moved to `node-only`

## 3. Lite-Pruning Inventory

Moved/kept as full-only:

- `test/core/10-selection-context-schema.test.ts`
- `test/core/12-handlers.test.ts`
- `test/core/32-job-queue-transport-integration.test.ts`
- `test/core/34-generic-http-provider-e2e.test.ts`
- `test/workflow-literature-digest/23-workflow-literature-digest-fixtures.test.ts`
- `test/workflow-literature-digest/50-workflow-literature-digest-mock-e2e.test.ts`

Case-level full-only (kept in same file, gated via `itFullOnly`):

- `test/workflow-literature-digest/21-workflow-literature-digest.test.ts`
  - legacy note-shape compatibility matrix
  - upsert/partial-fallback and all-skipped edge accounting
- `test/workflow-mineru/39-workflow-mineru.test.ts`
  - `attachments:`/`attachment:`/slash-parse compatibility fallbacks
  - orphan-images replacement and missing-`full.md` failure handling
- `test/ui/40-gui-preferences-menu-scan.test.ts`
  - submenu bubble guard and low-risk task/log command branches

Rationale:

- Execution cost is relatively high compared with PR feedback value
- Coverage is still retained in `full` gate
- Critical-path smoke confidence remains in `lite`

## 4. Parameterization Governance

Parameterization is preferred when:

- the scenarios share the same execution mode
- the scenarios share the same runtime affinity
- only inputs and expected outputs differ materially

Rules:

- keep coverage, reduce duplicated setup
- use explicit case tables
- do not hide major assertion differences behind nested conditionals
- do not merge `it(...)` and `itFullOnly(...)` into one test body

## 5. Selection-Context Rebuild Governance

Lite scope:

- Uses fixture derived from the first three parents of `selection-context-mix-all`
- Excludes standalone notes
- Keeps rebuilt artifacts for diagnosis

Full scope:

- Runs comprehensive rebuild matrix

## 6. Domain Group Command Governance

Supported grouped command level:

- First-level domains only: `core`, `ui`, `workflow`

Out of scope in this phase:

- Per-workflow grouped command variants

## 7. CI Gate Governance

Blocking gates:

- PR -> `test:gate:pr` (`lite`)
- release/main -> `test:gate:release` (`full`)

Reporting:

- Gate scripts print explicit start/end/failure status and keep blocking semantics tied to exit code.

Execution topology:

- `test:gate:release` still uses `full`
- Zotero `full` now runs as three sequential real-host processes:
  - `test:zotero:core:full`
  - `test:zotero:ui:full`
  - `test:zotero:workflow:full`
- any failing segment fails the overall release gate

## 8. Zotero Routine Lite/Full Allowlist

Routine Zotero runs are intentionally narrower than Node coverage. Their goal is
to prove real-host viability without duplicating logic-heavy regression matrices.

`lite` is the daily real-host baseline. `full` is a strict superset that adds a
broader stable-host coverage ring for CI gate use.

Retained `core` lite files:

- `test/core/00-startup.test.ts`
- `test/core/11-selection-context-rebuild.test.ts`
- `test/core/32-job-queue-transport-integration.test.ts`
- `test/core/41-workflow-scan-registration.test.ts`
- `test/core/42-hooks-startup-template-cleanup.test.ts`
- `test/core/45-runtime-log-manager.test.ts`
- `test/core/47-workflow-log-instrumentation.test.ts`
- `test/core/52-runtime-bridge.test.ts`
- `test/core/87-workflow-package-runtime-diagnostics.test.ts`
- `test/core/88-workflow-runtime-scope-diagnostics.test.ts`
- `test/core/89-workflow-debug-probe.test.ts`

Retained `ui` lite files:

- `test/ui/01-startup-workflow-menu-init.test.ts`
- `test/ui/35-workflow-settings-execution.test.ts` (smoke subset)
- `test/ui/40-gui-preferences-menu-scan.test.ts` (host-shell subset)
- `test/ui/50-workflow-settings-dialog-model.test.ts` (smoke subset)

Retained `workflow` lite files:

- `test/workflow-literature-digest/21-workflow-literature-digest.test.ts`
- `test/workflow-literature-explainer/21-workflow-literature-explainer.test.ts`
- `test/workflow-literature-workbench-package/45-workflow-note-import-export.test.ts`
- `test/workflow-mineru/39-workflow-mineru.test.ts`
- `test/workflow-tag-regulator/64a-workflow-tag-regulator-request-building.test.ts`
- `test/workflow-tag-regulator/64b-workflow-tag-regulator-apply-intake.test.ts` (host-safe subset)

Zotero `full` extra parity ring:

- `test/core/42-task-runtime.test.ts`
- `test/core/55-workflow-apply-seam-risk-regression.test.ts`
- `test/core/60-task-dashboard-history.test.ts`
- `test/core/62-task-dashboard-snapshot.test.ts`
- `test/core/63-job-queue-progress.test.ts` (selected cases)
- `test/core/70a-skillrunner-task-reconciler-state-restore.test.ts` (selected cases)
- `test/core/70b-skillrunner-task-reconciler-apply-bundle-retry.test.ts` (selected cases)
- `test/core/70c-skillrunner-task-reconciler-ledger-reconcile.test.ts` (selected cases)
- `test/core/71-skillrunner-run-dialog-ui-e2e-alignment.test.ts`
- `test/core/83-skillrunner-run-dialog-waiting-auth-observer.test.ts`
- `test/core/85-deferred-workflow-completion-tracker.test.ts`
- selected extra cases or full stable-suite prefixes in:
  - `test/ui/35-workflow-settings-execution.test.ts`
  - `test/ui/40-gui-preferences-menu-scan.test.ts`
  - `test/workflow-literature-digest/21-workflow-literature-digest.test.ts`
  - `test/workflow-literature-explainer/21-workflow-literature-explainer.test.ts`
  - `test/workflow-literature-workbench-package/45-workflow-note-import-export.test.ts`
  - `test/workflow-mineru/39-workflow-mineru.test.ts`
  - `test/workflow-tag-regulator/64b-workflow-tag-regulator-apply-intake.test.ts`

Coverage guardrail for `full`:

- The target is not “lite plus a few decorative extras”
- The target is stable host coverage across:
  - Zotero object lifecycle
  - SkillRunner transport/state/reconcile
  - workflow host context and idempotency
  - UI host shell behavior

Default exclusions from routine Zotero runs:

- package helper / library tests
- filterInputs / schema / payload-shape logic tests
- mock-heavy or fake DOM suites
- editor / picker / dialog interaction suites
- GitHub sync, local runtime, installer, and OS integration deep chains

## 9. Background Runtime Cleanup Governance

Real Zotero suites share module-level timers, listeners, and singleton state.
Those resources must not survive a test boundary.

Rules:

- shared Zotero setup must run unified background cleanup after every test
- failure diagnostics must be emitted before cleanup
- tests that explicitly start background loops should still perform local
  symmetric teardown when that shutdown is part of the test contract
- modules that own dialog timers, session subscriptions, or similar singleton
  state must expose `reset...ForTests` / `stop...ForTests` so the shared
  teardown harness can call them

SkillRunner-specific async lifecycle guardrail:

- stop-only cleanup is not sufficient for reconciler, session sync, run dialog
  observers, or comparable long-lived async loops
- these modules must expose stop-and-drain lifecycle semantics
- test teardown and critical production shutdown paths must await that drain
- generation invalidation is allowed only at async loop boundaries and
  post-await side-effect boundaries, not inside core business-state logic

## 10. Real Zotero Object Cleanup Governance

Real-host runs must not leak created parent items, notes, attachments, or
collections across test boundaries.

Rules:

- shared Zotero teardown must run tracked real-object cleanup after background
  cleanup
- handlers-created items, notes, attachments, and collections must be tracked
  automatically by shared test infrastructure
- direct `new Zotero.Item(...)` / `new Zotero.Collection()` creation must be
  explicitly registered for teardown cleanup
- deletion order must remain:
  1. child notes
  2. attachments
  3. other child items
  4. top-level parent items
  5. collections
- `ZOTERO_KEEP_TEST_OBJECTS` may preserve objects for local debugging but must
  not be used in CI or routine gates

## 11. Leak Probe Digest Governance

Tail degradation in real Zotero gates must be diagnosed with staged evidence.

Rules:

- enable probe explicitly with `ZOTERO_TEST_LEAK_PROBE=1`
- default output path is `artifact/test-diagnostics/`
- capture at least:
  - `test-start`
  - `pre-cleanup`
  - `post-background-cleanup`
  - `post-object-cleanup`
  - `domain-end`
- record these runtime surfaces in one JSON digest:
  - reconciler
  - session sync
  - run dialog
  - local runtime
  - backend health
  - runtime logs
  - real-object cleanup tracking
  - temp artifact tracking
- use the digest summary to rank residual growth before changing timeout
  budgets or execution ordering

## 12. Performance Probe Digest Governance

When leak probe output is inconclusive but real Zotero `full` still degrades
toward the tail, governance escalates to a performance probe digest.

Rules:

- enable explicitly with `ZOTERO_TEST_PERF_PROBE=1`
- default output path is `artifact/test-diagnostics/`
- record:
  - timing spans for key real-host operations
  - event-loop lag
  - host resource snapshots
- use the resulting summary to determine whether tail degradation is driven by:
  - operation cost growth
  - host-thread lag
  - host resource growth
- do not change timeout or ordering before this diagnostic step is completed

## 13. Full Gate Process Splitting Governance

Recent diagnostics established that:

- repeated real-host `saveTx()` writes materially amplify later test cost
- independent-process comparison is more representative than one monolithic
  endurance run when the gate goal is stable host coverage

Current rule:

- retained Zotero `full` coverage is preserved
- but execution topology is split into sequential independent domain runs
- this reduces single-process amplification without shrinking coverage
