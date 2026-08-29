## Why

Workflow callers still depend on a flat compatibility facade that exposes names shaped by the legacy TypeScript Synthesis service. V12 needs one grouped projection over the canonical client and Rust sidecar while keeping durable run, repository, lease, fencing, cleanup, and telemetry semantics internal.

The fixed implementation baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`; this change depends on `01-establish-workflow-host-v12-contract-foundation`.

## What Changes

- Define the grouped `workflowApply`, `topics`, `artifacts`, and `tags` Workflow projection with exactly fourteen callable members.
- Add canonical `applyTopicPlan`, staged-tag promotion, callback-scoped tag audit, and regulation acknowledgement contracts across the shared package, TypeScript client, and Rust sidecar.
- Make `withAuditRun` hide begin/append/finalize/abort, active ledger, lease, fencing, promotion, cancellation, and cleanup.
- Require regulation acknowledgement to consume a Host-confirmed mutation receipt rather than a raw clear request.
- Migrate built-in Synthesis and literature-workbench tag consumers to grouped names.
- Keep reverse Host effects on existing typed ports and keep Rust application/repository ownership intact.
- Prepare grouped adapters while retaining v11 flat names until final activation; final deletion of the legacy TypeScript service remains out of scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-layer-integration`: Define the grouped Workflow projection and canonical package/native parity.
- `synthesis-workflow-client`: Add the fourteen-member grouped client facade without exposing transport or repository internals.
- `synthesis-tag-vocabulary`: Add callback-scoped audit promotion and mutation-receipt regulation acknowledgement.

## Impact

- Canonical Synthesis contracts, TypeScript Synthesis client composition, Rust application/repository owners, built-in Synthesis workflows, tag auditor/regulator/bootstrapper, and existing native/client/workflow tests.
- No Workflow Host flat alias removal before activation, no repository or telemetry exposure, no new reverse-Host path, no legacy-service deletion, dependency change, or release action.
