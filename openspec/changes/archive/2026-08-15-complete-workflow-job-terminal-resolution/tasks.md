## 1. Resolver Slot Projection

- [x] 1.1 Add failing resolver tests for slot status vocabulary, ACP and SkillRunner canonical sampling, sequence identity fallback, local-ready edge, and terminal-outcome coherence.
- [x] 1.2 Implement `slotStatus` on every Workflow Job Terminal Resolution branch until the resolver decision table passes.

## 2. Run Seam Consumption

- [x] 2.1 Add injected run-seam slot-action tests covering waiting_user, waiting_auth, failed_retriable, running/repairing resume, and no-action statuses.
- [x] 2.2 Replace the two-pass terminal/slot observation with one resolver pass and remove run-seam lifecycle store reads used only for slot sampling.

## 3. Domain and Architecture Documentation

- [x] 3.1 Broaden the `Workflow Job Terminal Resolution` glossary entry in `CONTEXT.md`.
- [x] 3.2 Document slot status vocabulary, precedence, and run-seam ownership in the workflow execution seams architecture document.
- [x] 3.3 Update the workflow-execution-seams OpenSpec requirements and scenarios.

## 4. Verification

- [x] 4.1 Run the full workflow execution seams core test file and TypeScript checks.
