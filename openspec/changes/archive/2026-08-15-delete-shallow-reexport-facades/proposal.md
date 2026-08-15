## Why

Two modules exist only to re-export one function from an owning module:
`acpSkillRunDashboardFacade.ts` routes dynamic imports to
`acpSkillRunStore.listAcpSkillRunSummaries`, and `workflowSelectionPolicy.ts`
routes static imports to `workflows/triggerPolicy`. The interface exactly
matches the implementation, so both modules are shallow indirection without
depth or leverage.

## What Changes

- Delete `acpSkillRunDashboardFacade.ts` and point its three dynamic import sites directly at `acpSkillRunStore`.
- Delete `workflowSelectionPolicy.ts` and point its six static import sites directly at `workflows/triggerPolicy`.
- Keep dynamic import timing and owning-module exports unchanged.
- Add a preventive OpenSpec requirement against one-line re-export facades.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-execution-seams`: Require direct imports of owning modules and prohibit new single-function re-export facades.

## Impact

- `src/modules/hostBridgeCapabilityRegistry.ts`, `src/hooks.ts`, and six workflow selection importers.
- Two deleted shallow modules.
- New source-contract test guarding the import paths.
- No runtime behavior, dynamic-import timing, or exported function changes.
