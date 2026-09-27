# Architecture Hardening Baseline (M3 -> M4)

This document is the implementation output of change
`harden-architecture-inventory-and-debt-audit`.
It defines architecture boundaries, debt scoring, a dependency-ordered hardening
backlog, and acceptance criteria for downstream refactor changes.

## 1. Scope and Boundary Inventory

### 1.1 Inventory template (for downstream reuse)

Use the same template for every boundary:

- `Boundary`: unique boundary name
- `Owner Modules`: primary implementation files
- `Inbound Contracts`: entry points or caller interfaces
- `Outbound Contracts`: dependencies this boundary calls
- `State and Side Effects`: mutable state and persistence scope
- `Failure Surface`: expected failure classes
- `Evidence`: concrete file paths and existing tests
- `Risk Notes`: high-level risk summary

### 1.2 Boundary A: Workflow execution pipeline

- `Owner Modules`:
  - `src/modules/workflowExecute.ts`
  - `src/workflows/runtime.ts`
  - `src/modules/workflowRuntime.ts`
  - `src/jobQueue/manager.ts`
- `Inbound Contracts`:
  - context-menu command dispatch from `src/modules/workflowMenu.ts`
  - task status updates via `src/modules/taskRuntime.ts`
- `Outbound Contracts`:
  - provider execution (`src/providers/registry.ts`)
  - applyResult execution (`src/workflows/runtime.ts`)
  - runtime logging (`src/modules/runtimeLogManager.ts`)
- `State and Side Effects`:
  - queue state in memory
  - temporary bundle file extraction in OS temp directory
  - task records and user-facing alerts/toasts
- `Failure Surface`:
  - no valid input units
  - provider failures
  - applyResult failures
  - bundle extraction/cleanup failures
- `Evidence`:
  - `src/modules/workflowExecute.ts`
  - `src/workflows/runtime.ts`
  - `test/core/24-workflow-execute-message.test.ts`
  - `test/core/42-task-runtime.test.ts`
  - `test/core/47-workflow-log-instrumentation.test.ts`
- `Risk Notes`:
  - orchestration logic is concentrated in large files with mixed concerns.

### 1.3 Boundary B: Provider and backend adapter boundary

- `Owner Modules`:
  - `src/providers/registry.ts`
  - `src/providers/contracts.ts`
  - `src/providers/generic-http/provider.ts`
  - `src/providers/skillrunner/provider.ts`
  - `src/providers/pass-through/provider.ts`
  - `src/backends/registry.ts`
- `Inbound Contracts`:
  - request kind + backend type resolution
  - normalized provider runtime options
- `Outbound Contracts`:
  - external HTTP endpoints and local pass-through execution
  - backend profile auth/header materialization
- `State and Side Effects`:
  - transient network requests and response artifacts
- `Failure Surface`:
  - mismatched provider/backend pairing
  - malformed request payloads
  - remote API errors and protocol drift
- `Evidence`:
  - `src/providers/registry.ts`
  - `src/providers/contracts.ts`
  - `test/core/33-provider-backend-registry.test.ts`
  - `test/core/34-generic-http-provider-e2e.test.ts`
  - `test/core/38-generic-http-steps-provider.test.ts`
- `Risk Notes`:
  - request-kind growth may outpace contract normalization unless centralized.

### 1.4 Boundary C: Workflow hook loading and contract boundary

- `Owner Modules`:
  - `src/workflows/loader.ts`
  - `src/workflows/declarativeRequestCompiler.ts`
  - workflow manifests and hooks under `workflows/*`
- `Inbound Contracts`:
  - workflow directory scanning
  - manifest validation and hook resolution
- `Outbound Contracts`:
  - runtime-ready `LoadedWorkflow`
  - declarative request payloads consumed by providers
- `State and Side Effects`:
  - transient hook module loading in Zotero and Node runtimes
- `Failure Surface`:
  - invalid manifest fields
  - missing hook exports
  - runtime differences between Zotero and Node module loading
- `Evidence`:
  - `src/workflows/loader.ts`
  - `src/workflows/declarativeRequestCompiler.ts`
  - `test/core/20-workflow-loader-validation.test.ts`
  - `test/workflow-literature-digest/21-workflow-literature-digest.test.ts`
  - `test/core/41-workflow-scan-registration.test.ts`
- `Risk Notes`:
  - dual-runtime loading path increases compatibility complexity.

### 1.5 Boundary D: Workflow editor host and settings UI boundary

- `Owner Modules`:
  - `src/modules/workflowEditorHost.ts`
  - `src/modules/workflowSettingsDialog.ts`
  - `src/modules/workflowSettings.ts`
  - `src/modules/workflowMenu.ts`
  - `src/hooks.ts`
- `Inbound Contracts`:
  - preferences and menu actions
  - workflow-specific editor renderer registration
- `Outbound Contracts`:
  - persistent settings writes (`workflowSettingsJson`)
  - run-once overrides for execution context
- `State and Side Effects`:
  - in-memory run-once overrides
  - dialog host lifecycle
  - localized UI rendering
- `Failure Surface`:
  - missing UI globals (`ztoolkit`, dialog helpers)
  - invalid settings values
  - renderer lifecycle mismatches
- `Evidence`:
  - `src/modules/workflowEditorHost.ts`
  - `src/modules/workflowSettingsDialog.ts`
  - `src/modules/workflowSettings.ts`
  - `test/ui/44-workflow-editor-host.test.ts`
  - `test/ui/35-workflow-settings-execution.test.ts`
  - `test/ui/40-gui-preferences-menu-scan.test.ts`
- `Risk Notes`:
  - UI logic and schema/rendering logic are still heavily coupled in large files.

## 2. Evidence Requirements

Every debt candidate must include:

- `Scope`: boundary and module path(s)
- `Symptom`: concrete failure or maintainability pain
- `Evidence`: at least one code path and one test or issue signal
- `Risk Scores`: stability / maintainability / testability (1-5)
- `Priority`: derived from weighted score and dependency position
- `Suggested Action`: refactor, test hardening, or contract cleanup

Scoring formula:

- `WeightedScore = 0.45 * Stability + 0.35 * Maintainability + 0.20 * Testability`
- `Priority Bands`:
  - `P0`: WeightedScore >= 4.2
  - `P1`: 3.6 - 4.19
  - `P2`: 3.0 - 3.59
  - `P3`: < 3.0

## 3. Debt Register (Codebase + Archived Change Signals)

| ID | Debt Candidate | Evidence | Stability | Maintainability | Testability | Priority | Notes |
|---|---|---|---:|---:|---:|---|---|
| D-01 | Workflow execute orchestration is monolithic | `src/modules/workflowExecute.ts`, archived execution-related changes | 4 | 5 | 4 | P0 | Mixed concerns: selection, queue, provider, apply, UI feedback |
| D-02 | Runtime selection normalization is complex and branch-heavy | `src/workflows/runtime.ts` | 4 | 4 | 4 | P1 | Pass-through + attachment split logic is difficult to audit |
| D-03 | Hook loader has multi-path runtime loading complexity | `src/workflows/loader.ts` (`new Function`, dual fallback) | 4 | 4 | 3 | P1 | Node/Zotero parity risks |
| D-04 | Settings model has workflow-specific validation in generic module | `src/modules/workflowSettings.ts` | 3 | 4 | 3 | P2 | `reference-matching` special-casing increases coupling |
| D-05 | Settings dialog mixes rendering, schema, data collect, persistence wiring | `src/modules/workflowSettingsDialog.ts` | 3 | 5 | 3 | P1 | Very large UI module |
| D-06 | Global runtime dependencies are scattered | `src/hooks.ts`, `src/modules/workflowEditorHost.ts`, `src/index.ts` | 3 | 4 | 3 | P2 | `ztoolkit` and global bridge access pattern not centralized |
| D-07 | Contract spread across provider contracts + request compiler + manifests | `src/providers/contracts.ts`, `src/workflows/declarativeRequestCompiler.ts`, `workflows/*/workflow.json` | 3 | 4 | 4 | P1 | Contract drift risk as kinds grow |
| D-08 | Test taxonomy is file-number based, not domain-based | `test/{core,ui,workflow-*}/*.test.ts`, `doc/testing-framework.md` | 3 | 4 | 5 | P1 | Hard to select risk-targeted gates |
| D-09 | Mock/real API parity requires stronger governance | `test/setup/zotero-mock.ts`, archived bugfix changes | 4 | 3 | 4 | P1 | Regression escapes caused by runtime differences |
| D-10 | Documentation structure is fragmented for hardening review | `doc/components/*.md`, `doc/architecture-flow.md` | 2 | 4 | 3 | P2 | Hard to map architecture docs to backlog actions |

## 4. Dependency-Ordered Hardening Backlog

Output format for downstream changes (required fields):

- `WorkItem ID`
- `Objective`
- `DependsOn`
- `Boundary`
- `Primary Files`
- `Expected Test Impact`
- `Exit Criteria`

### Ordered backlog

1. `HB-01` Baseline extraction for runtime orchestration seams
   - DependsOn: None
   - Boundary: A
   - Focus: `src/modules/workflowExecute.ts`, `src/workflows/runtime.ts`
2. `HB-02` Workflow loader contract hardening
   - DependsOn: HB-01
   - Boundary: C
   - Focus: `src/workflows/loader.ts`, manifest validation path
3. `HB-03` Provider/request contract normalization pass
   - DependsOn: HB-01, HB-02
   - Boundary: B
   - Focus: contracts + compiler + provider resolver
4. `HB-04` Settings domain decoupling (validation vs persistence)
   - DependsOn: HB-01
   - Boundary: D
   - Focus: `src/modules/workflowSettings.ts`
5. `HB-05` Settings dialog render-model split
   - DependsOn: HB-04
   - Boundary: D
   - Focus: `src/modules/workflowSettingsDialog.ts`
6. `HB-06` Global runtime bridge cleanup
   - DependsOn: HB-04, HB-05
   - Boundary: D
   - Focus: globals and host bridge wiring
7. `HB-07` Test taxonomy regroup + suite gate alignment
   - DependsOn: HB-01, HB-03
   - Boundary: A/B (test layer)
   - Focus: test domain regroup and suite mapping
8. `HB-08` Mock parity governance and drift tests
   - DependsOn: HB-02, HB-07
   - Boundary: C + test infra
   - Focus: mock-real behavior compatibility checks
9. `HB-09` Documentation consolidation for hardening review
   - DependsOn: HB-01..HB-08
   - Boundary: doc layer
   - Focus: architecture + testing + acceptance mapping

## 5. Refactor Acceptance Checklist (Downstream Gate)

Every hardening implementation change must pass all required checks:

- `Behavior Parity`
  - [ ] existing workflow behavior remains unchanged unless explicitly specified
  - [ ] pass-through and generic-http execution paths maintain current contracts
- `Test Parity`
  - [ ] all pre-existing node full tests pass
  - [ ] affected Zotero test suites pass for impacted boundaries
  - [ ] no silent test removal without explicit migration record
- `Readability Delta`
  - [ ] module responsibility is clearer after change
  - [ ] non-obvious invariants are documented
  - [ ] test intent/fixture provenance notes are updated where impacted
- `Boundary Guard`
  - [ ] no concrete workflow-id business branching is introduced in `src/**`
  - [ ] workflow-specific settings semantics are implemented via workflow-owned extension hooks (e.g. `hooks.normalizeSettings`)
- `Traceability`
  - [ ] change links to this baseline `WorkItem ID`
  - [ ] code paths and tests updated are listed in change tasks
  - [ ] rollback risk and mitigation are documented

## 6. Review and Finalization Notes

- This baseline is intentionally implementation-ready but code-agnostic.
- It is the handoff artifact for next changes:
  - `restructure-test-taxonomy-by-domain`
  - `define-lite-full-suite-and-ci-gates`
  - `add-high-risk-smoke-and-regression-tests`
  - `improve-code-and-test-reviewability`

## 7. HB-08 Completion Evidence (govern-zotero-mock-parity)

- Governance contract and drift register:
  - `doc/components/zotero-mock-parity.md`
- Mock capability declaration + drift annotation entry:
  - `test/setup/zotero-mock.ts` (`Zotero.__parity`)
- First drift/parity test slice:
  - `test/core/53-zotero-mock-parity-governance.test.ts`
- Test strategy alignment updates:
  - `doc/testing-framework.md`

## 8. Baseline Reassessment Link

Post-refactor residual risk reassessment (baseline-constrained) is published at:

- `doc/architecture-hardening-baseline-reassessment.md`
