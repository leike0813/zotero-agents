## Why

JavaScript workers cannot be physically preempted once async work has started.
Epoch checks outside the final write transaction are advisory only. Derived
Registry-dependent worker output must be invisible until it passes a final
transaction-local basis check.

## What Changes

- Capture `graph_basis_registry_epoch` at worker start.
- Store staging or run-scoped output for graph structure, metrics, layout, and
  related read models.
- Promote staged output only in a transaction that rereads active basis.
- Mark stale events/jobs superseded and leave active state unchanged.
- Recover previous-session running rows at startup.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `synthesis-literature-registry-citation-graph`: Derived workers use
  basis-checked promotion.

## Impact

Affected implementation includes dirty event/job state, graph/metrics/layout
worker repository APIs, startup cleanup, and graph worker tests.
