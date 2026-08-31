## Why

Workflow callers still depend on a flat compatibility facade that exposes names shaped by the legacy TypeScript Synthesis service. V12 needs one grouped projection over the canonical client and Rust sidecar while keeping durable run, repository, lease, fencing, cleanup, and telemetry semantics internal.

The fixed implementation baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`; this change depends on `01-establish-workflow-host-v12-contract-foundation`.

Architecture source: [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md), especially §§8.5–8.6, 9, 10, 15.2, 17, 18, and 19. The architecture record is authoritative for the fourteen-member grouped projection, audit-run lifecycle, promotion and acknowledgement evidence, sidecar ownership, cancellation, cleanup, and parity requirements summarized here.

## What Changes

- Define the grouped `workflowApply`, `topics`, `artifacts`, and `tags` Workflow projection with exactly fourteen callable members.
- Add canonical `applyTopicPlan`, staged-tag promotion, callback-scoped tag audit, and two-phase regulation acknowledgement contracts across the shared package, TypeScript client, and Rust sidecar.
- Make `withAuditRun` hide begin/append/finalize/abort, active ledger, lease, fencing, promotion, cancellation, and cleanup.
- Require regulation acknowledgement to consume a Host-confirmed mutation receipt rather than a raw clear request.
- Keep reverse Host effects on existing typed ports and keep Rust application/repository ownership intact.
- Prepare the grouped candidate behind one v11 flat adapter. Eleven equivalent flat calls delegate to the grouped implementation; the three v11-only planning/audit compatibility calls remain invocation-late legacy passthroughs until atomic v12 activation.
- Final deletion of the legacy TypeScript service remains out of scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-layer-integration`: Define the grouped Workflow projection and canonical package/native parity.
- `synthesis-workflow-client`: Add the fourteen-member grouped client facade without exposing transport or repository internals.
- `synthesis-tag-vocabulary`: Add callback-scoped audit promotion and mutation-receipt regulation acknowledgement.
- `zotero-host-broker-capability-api`: Deliver the Broker-owned canonical tag digest with each traversal item so audit callbacks can forward same-read evidence without hashing tags themselves.

## Impact

- Canonical Synthesis contracts, the traversal-only Workflow Host item DTO, Broker traversal serialization, TypeScript Synthesis client composition, Rust application/repository owners, and existing native/client/workflow tests.
- No Workflow Host flat alias removal before activation, no repository or telemetry exposure, no public reverse-Host path, no legacy-service deletion, dependency change, or release action.
