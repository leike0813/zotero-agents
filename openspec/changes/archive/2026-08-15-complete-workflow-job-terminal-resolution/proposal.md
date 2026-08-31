## Why

The Workflow Job Terminal Resolution deepening stopped one step short: the run seam still re-walks sequence, SkillRunner, and ACP stores to sample submission-slot status while the resolver separately reads the same facts for terminality. Two interpreters of one read-only observation can drift, and slot-policy changes must be tested through store-shaped paths.

## What Changes

- Extend the one Workflow Job Terminal Resolution projection so every classification also carries a normalized `slotStatus`.
- Derive slot status from per-job request kind and backend facts, canonical records first with local queue-state fallback.
- Let canonical terminal outcomes own slot status while preserving canonical-first slot sampling for pending and local-ready resolutions.
- Reduce the run seam to one resolver call per job per observation pass; the run seam maps slot statuses to submission-slot actions and no longer reads lifecycle stores.
- Preserve the exact yield/ensure-slot precedence and semantics.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-execution-seams`: Require the terminal resolution projection to carry normalized slot status and require the run seam to consume that projection instead of reading lifecycle stores for slot sampling.

## Impact

- `src/modules/workflowExecution/terminalResolution.ts` and `src/modules/workflowExecution/runSeam.ts`.
- Workflow-execution seam test suite gains resolver slot-status decision coverage and injected run-seam slot-action coverage.
- `CONTEXT.md`, `doc/components/workflow-execution-seams.md`, and the workflow-execution-seams OpenSpec.
- No persistence format, store-write ownership, provider protocol, subscription, or slot-coordinator behavior changes.
