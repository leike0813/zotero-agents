## Why

After the client foundation, lifecycle hooks, Host Bridge invalidation, and Zotero item notification handling still resolve the full legacy service for a small set of operations. Migrating these narrow consumers reduces the legacy allowlist and proves grouped system, maintenance, and notification capabilities before the larger Workbench/proxy changes.

## What Changes

- Extend the contracts package with grouped system, maintenance, and host-notification client capabilities.
- Extend the in-process adapter through narrow legacy ports for startup reconciliation, protected reset, and related-items sync echo consumption.
- Make default client invalidation synchronously invalidate the cached in-process client and any loaded legacy service instance.
- Migrate `src/hooks.ts`, `hostBridgeServer.ts`, and `synthesis/itemObserver.ts` away from direct service imports.
- Update boundary inventory, tests, and current-state documentation without changing production ownership.

## Capabilities

### New Capabilities

- `synthesis-client-lifecycle-consumers`: Defines grouped lifecycle, maintenance, notification, and default-client invalidation behavior for the migration-time client.

### Modified Capabilities

None.

## Impact

- `packages/synthesis-contracts` grouped client interfaces and DTOs.
- Plugin-side in-process/default client adapters.
- Startup hooks, Host Bridge invalidation, and item observer dependencies.
- Boundary inventory and targeted lifecycle/observer tests.
