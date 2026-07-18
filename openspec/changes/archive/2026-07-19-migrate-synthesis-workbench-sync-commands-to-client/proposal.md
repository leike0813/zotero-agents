## Why

The production Synthesis Workbench still resolves the complete legacy service for its remaining Git and WebDAV Sync commands, even though other Workbench commands now use bounded client capabilities. Moving these commands behind `client.sync` completes the Workbench service-boundary migration while preserving the existing Sync domain, service surface, and UI orchestration.

## What Changes

- Add environment-neutral Git and WebDAV Sync command contracts under `SynthesisClient.sync` with a shared transport interface, canonical conflict actions, and opaque JSON-safe results.
- Add ten narrow optional in-process legacy ports with strict conflict request rebuilding, shared result normalization, and stable client error classification.
- Add a fresh default-client helper that invalidates both the cached client and the legacy default service before every Sync command.
- Route all ten Workbench Git/WebDAV Sync commands through a dynamically acquired fresh client while preserving single-flight, action defaults, deferred-start, failure-state transformation, polling, and Sync chrome behavior.
- Move the pure `topicPathId` helper into the Synthesis foundation so Workbench no longer imports the complete service.
- Update the service inventory and current-state documentation while retaining the 128-method public service surface and raw Sync APIs used by Host Bridge and MCP.

## Capabilities

### New Capabilities

- `synthesis-workbench-sync-command-client-consumer`: Defines bounded Sync command contracts, fresh-client acquisition, strict in-process adaptation, and preserved Workbench Git/WebDAV orchestration.

### Modified Capabilities

None.

## Impact

The change affects Synthesis client contracts, the in-process adapter and default composition, the Synthesis foundation/service boundary, production Workbench command routing, service inventory, focused client/boundary/UI tests, and current-state Synthesis documentation. It does not change Sync persistence, locking, retries, conflict semantics, preferences, credentials, connection tests, Host Bridge, MCP, or the public service method inventory.
