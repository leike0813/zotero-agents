## 1. OpenSpec

- [x] 1.1 Add proposal, design, spec deltas, and tasks for long PDF page-range splitting.
- [x] 1.2 Validate `upgrade-mineru-long-pdf-splitting` with strict OpenSpec validation.

## 2. Workflow Implementation

- [x] 2.1 Add MinerU preflight page-count/outline split planning and diagnostics.
- [x] 2.2 Add MinerU buildRequest hook that emits Generic HTTP steps with optional page ranges.
- [x] 2.3 Update MinerU applyResult to merge aggregate child bundles through staged materialization.
- [x] 2.4 Update workflow manifest, builtin content manifest, and README.

## 3. Tests And Verification

- [x] 3.1 Extend MinerU workflow tests for manifest hooks, split planning, buildRequest page ranges, and aggregate apply merging.
- [x] 3.2 Run focused MinerU workflow tests.
- [x] 3.3 Run TypeScript validation and builtin workflow manifest check.
