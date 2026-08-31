## Why

Public maintenance operation identity currently includes its acceptance timestamp, so replaying an identical sidecar request creates another receipt and another worker. Startup reconciliation also reads only the newest 1,000 operations before filtering and repository open preemptively cancels every running row, which can hide or misclassify persisted public maintenance work.

## What Changes

- Derive public maintenance identity from the stable request ID, capability, and canonical argument basis, and execute work only for the first durable insert.
- Return the existing running or terminal receipt for an identical request replay without duplicating Host effects, autosync ownership, or lifecycle events.
- Move restart classification out of repository open and into explicit runtime reconciliation.
- Reconcile all non-terminal operations through bounded stable-key pagination: public pending work requires continuation, public running work fails with an unknown-effect receipt, and other stale running work is canceled.
- Add source-fresh real-process replay and restart coverage, current runtime documentation, and fourth-stage audit evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-work-governance`: Define request-level replay safety, first-insert-only execution, and public-maintenance-specific restart classification.
- `synthesis-sidecar-isolated-repository-foundation`: Keep repository open free of operation lifecycle policy and expose bounded stable-key operation reads for explicit reconciliation.

## Impact

The change affects the Rust production client, public maintenance lifecycle, repository operation query, source-fresh production-route tests, OpenSpec, current Synthesis runtime documentation, and the premerge audit. It changes no public client method, wire operation, reverse-Host capability, SQLite schema, dependency, release artifact, or feed.
