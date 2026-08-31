## Why

The production Synthesis Workbench still bypasses the established `SynthesisClient.workbench` boundary for eleven UI reads, which keeps UI transport conversion duplicated and prevents the client seam from becoming the stable query boundary. These existing client capabilities can now replace the direct reads without expanding domain semantics or moving runtime ownership.

## What Changes

- Route production Workbench chrome, surface, Topic detail, and paper digest reads through `SynthesisClient.workbench`.
- Add one shared UI adapter for state, opaque projection, and digest DTO conversion, and reuse it from production and the read-only harness.
- Preserve region-scoped rendering, stale-request guards, last-known-good snapshots, update eligibility, export, and graph-layout refresh behavior.
- Preserve SQLite busy as the stable transient client error code `storage_busy`.
- Keep commands, prewarm callbacks, progress polling, options, mutations, Host Bridge, MCP, and `getTopicReport` on their current paths.

## Capabilities

### New Capabilities

- `synthesis-workbench-ui-client-consumer`: Defines production Workbench consumption of the existing region-scoped client reads, shared transport adaptation, and transient busy behavior.

### Modified Capabilities

None.

## Impact

- `packages/synthesis-contracts` stable error codes.
- `src/modules/synthesisClient` in-process routing and shared Workbench UI adapter.
- Production Workbench and read-only UI harness read composition.
- Synthesis client, Workbench UI, harness, and service-boundary tests.
- Current-state Synthesis layer documentation and migration inventory.
