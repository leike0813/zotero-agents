# Proposal

## Why

Planner-created topics appear only in the graph, and the creation form requests existing topics instead of planned topics. Users cannot materialize a planned topic directly from the workbench or consistently update topics across views.

## What Changes

- Preserve the planned workflow-options filter and the planning lifecycle needed by the page.
- Combine materialized and planned topics in the Topics list/grid projection without changing artifact inventories or Home statistics.
- Add creation/update actions to all three views, with planned-topic form prefill, stale-state disabling, accessible grid icons, and owner-scoped pending feedback.
- Validate launch targets against current workflow options instead of the first artifact page.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-workbench-ui`: planned topics and lifecycle-aware actions across list, grid, and graph inspector.
- `topic-synthesis-workflows`: correct planned-option filtering and target-preserving workflow launch prefill.

## Impact

Touches the workflow option adapter, portable workbench projection, Topics components, workflow launch routing, localization, existing behavioral tests, and Topics documentation. Reuses native capabilities and current bounded surface inputs; no persistence migration, dependency change, or native protocol change.
