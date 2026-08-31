## 1. Terminal Resolution Contract

- [x] 1.1 Add failing table-driven tests for missing, pending, local-ready, canonical-ready, sequence-root gating, request identity, and evidence priority.
- [x] 1.2 Implement the synchronous `WorkflowJobTerminalResolution` interface and resolver until the decision table passes.

## 2. Seam Integration

- [x] 2.1 Add a failing run-seam regression proving a missing admitted job settles terminal observation, then inject the resolver and remove duplicate terminal interpretation.
- [x] 2.2 Add or adapt apply-seam coverage for the four resolution variants, then inject the resolver and remove the apply-owned helper without moving reducer or store-write behavior.

## 3. Domain and Architecture Documentation

- [x] 3.1 Add `Workflow Job Terminal Resolution` to `CONTEXT.md` without implementation details.
- [x] 3.2 Document resolution ownership, evidence priority, and remaining run/apply responsibilities in the workflow execution seams architecture document.

## 4. Verification

- [x] 4.1 Run focused and full core tests, build/type checks, lint, and strict OpenSpec validation.
