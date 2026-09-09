# Architecture Hardening Baseline Reassessment (M3 -> M4)

This reassessment is constrained to `doc/architecture-hardening-baseline.md` only.

- Source set:
  - baseline boundary inventory (Section 1)
  - debt register `D-01..D-10` (Section 3)
  - backlog `HB-01..HB-09` (Section 4)
  - acceptance checklist (Section 5)
- Out of scope:
  - roadmap expansion beyond baseline-defined concerns
  - dependency mapping to not-yet-implemented future changes

## 1. Severity Rubric

- `Impact`: 1..5
- `Likelihood`: 1..5
- `RiskScore = Impact * Likelihood`
- Bands:
  - `High`: 16..25
  - `Medium`: 9..15
  - `Low`: 1..8

## 2. Normalized Residual Risk Register

Required fields used per entry:
`id`, `area`, `statement`, `evidence`, `severity`, `impact`, `likelihood`, `owner`, `mitigation`, `target_change`.

`target_change` in this reassessment references baseline work items (`HB-*`) or `N/A` when no immediate change is required.

| id | area | statement | evidence | severity | impact | likelihood | owner | mitigation | target_change | closure_state |
|---|---|---|---|---|---:|---:|---|---|---|---|
| RR-D01 | Workflow execution pipeline | Core execution logic remains branch-rich even after seam extraction; maintainability risk is reduced but still non-trivial. | `src/workflows/runtime.ts`, baseline D-01/D-02 | Medium | 4 | 3 | Workflow Runtime | Continue local extraction of normalization branches and keep parity tests current | HB-01 | planned |
| RR-D03 | Loader contracts | Dual-runtime loader complexity still exists, but hardening outcomes and loader tests provide guardrails. | `src/workflows/loader.ts`, `test/core/20-workflow-loader-validation.test.ts`, baseline D-03 | Low | 2 | 2 | Workflow Loader | Keep validation/compat tests aligned with loader changes | HB-02 | retired |
| RR-D04 | Settings domain | Workflow-specific semantics were decoupled via hook path; residual risk is now mainly consistency drift in future edits. | `src/modules/workflowSettings.ts`, `src/modules/workflowSettingsNormalizer.ts`, baseline D-04 | Low | 2 | 2 | Workflow Settings | Enforce settings boundary checklist during reviews | HB-04 | retired |
| RR-D05 | Settings UI model | Settings dialog file size and UI complexity still indicate maintainability risk despite model split. | `src/modules/workflowSettingsDialog.ts`, baseline D-05 | Medium | 3 | 4 | Workflow Settings UI | Continue UI decomposition and reviewer-focused documentation | HB-05 | planned |
| RR-D06 | Runtime globals | Global bridge consolidation reduced scatter; residual risk is low and mostly regression-monitoring. | `src/utils/runtimeBridge.ts`, `src/hooks.ts`, baseline D-06 | Low | 2 | 2 | Runtime/Core | Keep bridge access centralized and covered by tests | HB-06 | retired |
| RR-D07 | Provider/request contracts | Contract normalization lowered immediate risk; residual risk remains if new request kinds bypass contract checks. | `src/providers/contracts.ts`, `src/workflows/declarativeRequestCompiler.ts`, baseline D-07 | Medium | 3 | 3 | Provider/Workflow Contracts | Maintain contract+doc alignment checklist for new kinds | HB-03 | accepted |
| RR-D08 | Test taxonomy | Baseline highlighted taxonomy debt; residual risk remains until regroup and suite policy are fully established. | `doc/testing-framework.md`, baseline D-08 | Medium | 4 | 3 | Testing Governance | Complete baseline test-governance backlog execution | HB-07 | planned |
| RR-D09 | Mock parity | Governance exists, but mock surface remains large; parity drift risk is still present at medium level. | `test/setup/zotero-mock.ts`, `test/core/53-zotero-mock-parity-governance.test.ts`, baseline D-09 | Medium | 4 | 3 | Test Infrastructure | Continue parity governance and drift-focused test maintenance | HB-08 | planned |
| RR-D10 | Architecture doc cohesion | Documentation cohesion improved but still requires periodic synchronization discipline. | `doc/architecture-hardening-baseline.md`, baseline D-10 | Low | 2 | 3 | Architecture Docs | Keep baseline + reassessment sync cadence | HB-09 | accepted |

## 3. No-Regression Revalidation Notes

- Revalidated mitigated areas with low residual status:
  - Loader contract hardening (`HB-02`) -> `RR-D03` retired.
  - Settings domain decoupling (`HB-04`) -> `RR-D04` retired.
  - Runtime global bridge cleanup (`HB-06`) -> `RR-D06` retired.
- Revalidation criterion: current implementation still respects baseline boundary intent and no contradictory evidence was found in key tests/docs.

## 4. Closure Summary

- `planned`: 4
- `accepted`: 2
- `retired`: 3
- `High` risks: 0
- `Medium` risks: 5
- `Low` risks: 4

All listed risks are baseline-constrained and mapped to baseline work items or explicit monitoring state.
