## Why

The read-only Synthesis UI harness still constructs and calls the complete legacy service directly for four pure Workbench reads. This leaves a second service composition path outside the client boundary and prevents the same region-scoped read contract from being exercised before production Workbench migration.

## What Changes

- Add an environment-neutral `SynthesisClient.workbench` group for chrome, surface, Topic detail, and paper digest reads.
- Keep chrome and surface projections separate and JSON-safe; do not introduce or route through the legacy full snapshot.
- Move the Workbench surface-name union to the contracts package as its single source of truth.
- Consolidate default and read-only legacy service creation behind one migration-time composition root.
- Rename the read-only harness composition from service-shaped to client-shaped while retaining read-only adapters and explicit close ownership.
- Route the UI harness through the grouped client and preserve its current observable read-only behavior.
- Reduce the direct legacy service consumer allowlist from five entries to four.

## Capabilities

### New Capabilities

- `synthesis-workbench-read-client`: Defines the four region-scoped Workbench read contracts, JSON-safe routing, read-only harness migration, and single legacy composition boundary.

### Modified Capabilities

None. Production Workbench, Host Bridge, MCP, process ownership, and persistence behavior remain unchanged.

## Impact

- `packages/synthesis-contracts` gains Workbench request/result DTOs and a grouped client interface.
- The in-process client adapter and default client composition share one legacy-service resolver.
- The Node UI harness returns and consumes `SynthesisClient` instead of the legacy service.
- Synthesis boundary inventory, current-state documentation, and existing client/harness tests are updated.
