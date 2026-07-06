## Overview

`hooks.preflight` is a workflow runtime hook for read-only execution planning. It runs after input units are resolved and before request construction. It never writes Zotero data and never creates provider requests. `buildRequest` remains the only hook that creates provider payloads, and `applyResult` remains the only workflow hook that writes results.

## Contract

Preflight outcomes:

- `continue`: keep the current input unit and optionally pass `context` to `buildRequest` and `resultContext.preflight`.
- `replace-units`: replace one resolved input unit with virtual units, each with its own `selectionContext` override and `context`.
- `short-circuit-apply`: skip provider dispatch and invoke the standard apply seam with local `resultJson`.
- `skip`: skip the current input unit without treating it as a provider failure.

Aggregate v1 is intentionally narrow: `mode: "single-apply"`, `applyWhen: "all-succeeded"`, and `orderBy: "unit.order"`. Child requests run normally, but their per-job apply is suppressed. When all children in the aggregate succeed, runtime builds one aggregate result context and calls the workflow `applyResult` once. If any child fails, no partial aggregate apply runs.

## Runtime Shape

Preparation creates execution units from resolved selection contexts. When a workflow declares `preflight`, each unit is passed to the hook. The runtime converts outcomes into:

- normal units for `continue`
- replacement units for `replace-units`
- local apply records for `short-circuit-apply`
- skipped counts for `skip`

Requests keep preflight metadata outside `selectionContext`. The same metadata is attached to job meta and to `WorkflowResultContext.preflight`.

Aggregate plans are stored in prepared execution state. Apply seam groups completed jobs by aggregate id. Aggregate children include request, run result, child result context, bundle reader, unit id, unit order, and preflight context. Cleanup of temporary bundle files remains owned by apply seam.

## Compatibility

Existing workflows have no `preflight` hook, so their preparation, dispatch, and apply behavior remains byte-for-byte equivalent at the contract level. Provider contracts do not gain required fields. Sequence step apply continues to use its existing path; aggregate apply is only enabled for requests created by preflight replacement units that declare an aggregate plan.

## Non-Goals

- Implementing metadata curation or MinerU splitting workflows in this change.
- Persisting aggregate plans across process restarts.
- Adding provider-specific multi-result aggregation.
- Running preflight during menu enablement, debug classification, or other read-only visibility checks.
