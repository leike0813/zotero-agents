## Why

Recent verification found several Synthesis Layer implementation paths marked complete while still diverging from the active design contracts. The remaining gaps affect durable Zotero related-items sync, rebuild safety, identity stability, discovery hint actions, and drift acceptance thresholds.

## What Changes

- Add a durable, graph-triggered related-items sync path with default Zotero host integration and notifier echo suppression.
- Preserve accepted identity redirects/tombstones across full Registry rebuilds and add ISBN as a strong identity anchor.
- Block Registry candidate promotion when durable related-items effects cannot be resolved against the candidate graph/bindings.
- Add reject/restore discovery hint actions and keep the UI reject-only.
- Align startup bulk drift detection with the documented `>50` or `>5%` threshold.
- Align reference-resolution state-machine docs with the implemented `matched/suggested/unmatched/ambiguous` contract.

## Capabilities

### New Capabilities

- `synthesis-related-items-sync`: Durable Zotero related-items sync scheduling, echo suppression, and recovery behavior.

### Modified Capabilities

- `synthesis-paper-registry`: ISBN anchors and durable redirect/tombstone decisions participate in literature identity selection.
- `synthesis-literature-registry-citation-graph`: Registry candidate validation covers durable sync effects, and graph promotion queues related-items sync.
- `synthesis-persistence-performance`: Startup reconcile bulk drift detection uses the relaxed documented thresholds.
- `synthesis-workbench-ui`: Discovery hints expose reject/restore only, with no accept action.
- `synthesis-reference-resolution-matcher`: State-machine documentation is aligned to the current matcher status contract.

## Impact

This affects Synthesis repository schema, update-event routing, registry identity helpers, rebuild validation, worker scheduling, Zotero notifier handling, Workbench hint actions, and focused core tests. No dependency changes or Git history changes are required.
