## 1. Freeze Evidence and Add Failing Coverage

- [x] 1.1 Record the fixed baseline, current candidate identity, clean-worktree state, and source-fresh failures for four parity gates, performance setup, and full core
- [x] 1.2 Add focused failing coverage for Topic readiness/reopen, restart reconciliation, synthetic locator materialization, and strict request/result failure classification

## 2. Restore Application Differential Evidence

- [x] 2.1 Add one exact Rust-only redirect-schema-marker parity policy and adopt it in all four application checkers
- [x] 2.2 Restore fixed-baseline Topic readiness, freshness, empty-patch preservation, and batched reference reads in the Node application oracle
- [x] 2.3 Align Node restart diagnostics and explicitly reconcile reopened work in the Rust typed parity driver
- [x] 2.4 Update the checkpoint/WebDAV parity Host fixture to the current recursive DTO contract
- [x] 2.5 Pass all four direct application parity gates and their existing cross-language wrapper coverage

## 3. Restore Governed Performance Evidence

- [x] 3.1 Derive synthetic manifest locators and materialized sidecar JSON assets from one fixture-owned payload map
- [x] 3.2 Extend the existing benchmark fixture test to validate every locator resolves to a JSON object asset
- [x] 3.3 Pass the 2k scoped run and the full 2k/10k/25k production-route performance gate without relaxing budgets

## 4. Restore the Complete Core Suite

- [x] 4.1 Remove test 102's legacy service dependency and reset native client composition state in shared setup
- [x] 4.2 Map request conversion failures to `invalid_request`, result conversion failures to `internal`, and enforce bearer/lifecycle precedence before capability DTO validation
- [x] 4.3 Align Host Bridge, MCP, Workbench, client, workflow, sidecar runtime, compute, and production-route fixtures with current strict DTOs using shared corpus/harness facts
- [x] 4.4 Replace brittle UI source slicing and stale CI-runner source assertions with behavior/SSOT-based checks
- [x] 4.5 Allow the production TraceContext marker while retaining zero diagnostics-exclusive bytes and the diagnostics-only forbidden markers
- [x] 4.6 Pass the complete `test:node:core:full` suite without exclusions, skips, compatibility defaults, or suite-order dependence

## 5. Verification and Audit Receipt

- [x] 5.1 Pass contracts, repository, application, service, cross-language, service-boundary, production-capability, and runtime-diagnostics checks
- [x] 5.2 Pass Rust format, Clippy, workspace tests, build, and the Stage 1 sidecar suite
- [x] 5.3 Pass strict OpenSpec validation, scoped formatting/lint, and diff whitespace checks
- [x] 5.4 Append the source-fresh parity, performance, full-core, and remaining desktop-smoke boundary to the premerge audit

## Execution Baseline

- Fixed behavior baseline: `main@e210997a11e0054a3cb4ae0656e5cfb96102a09c`
- Repair starting identity: `bd25af9b chore: harden synthesis sidecar recursive DTO contracts`
- Starting worktree: clean before this OpenSpec change was created
- Application parity: all four direct gates failed; the observed classes were Topic readiness/restart drift, one exact Rust redirect-graph schema marker, and an obsolete Node WebDAV Host fixture
- Performance: 2k/10k/25k setup returned `invalid_request` before formal samples because four manifest sidecar locators were not materialized
- Full core: initial load failed at test 102's deleted legacy service export; a diagnostic run past that loader found 73 failures, which remain in scope until the unfiltered suite passes
