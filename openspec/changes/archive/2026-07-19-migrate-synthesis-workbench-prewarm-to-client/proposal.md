## Why

Synthesis Workbench prewarm still delegates phased reads and publication callbacks to the legacy service even though the client already exposes the required region-scoped `readChrome` and `readSurface` capabilities. Moving orchestration to the Workbench host removes a UI-specific callback API from the service boundary without expanding the client contract.

## What Changes

- Orchestrate phased Workbench prewarm in the plugin host using existing client chrome and surface reads.
- Preserve single-flight behavior, default surface ordering, chrome-only empty surface lists, event-loop yielding, per-surface error isolation, cache merging, and guarded runtime publication.
- Remove the legacy public `warmSynthesisWorkbenchSurfaces` service method and its migration inventory group.
- Keep progress polling, report reads, commands, mutations, Host Bridge, MCP, storage ownership, and client contracts unchanged.

## Capabilities

### New Capabilities

- `synthesis-workbench-prewarm-client-consumer`: Defines client-orchestrated phased Workbench prewarm and retirement of the legacy service callback surface.

### Modified Capabilities

None.

## Impact

- Synthesis Workbench prewarm orchestration and UI runtime publication.
- Legacy Synthesis service public surface and migration inventory.
- Workbench UI and service-boundary regression tests.
- Current-state Synthesis layer documentation.
