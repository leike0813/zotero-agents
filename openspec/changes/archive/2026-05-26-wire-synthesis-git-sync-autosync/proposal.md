## Why

Git Sync already has a debounced `notifyCanonicalStoreChanged()` worker, but successful Synthesis canonical writes through `SynthesisService` do not call it. As a result, canonical store changes can remain local until a manual sync, even when a Git Sync adapter is configured.

## What Changes

- Wire service-level canonical mutators to Git Sync autosync notification after successful writes.
- Keep autosync best-effort: notification failures SHALL NOT roll back committed canonical changes.
- Preserve current defaults: no configured Git adapter still means Git Sync is disabled.
- Add a service option to tune Git Sync debounce timing for tests and host configuration.

## Capabilities

### New Capabilities

- `synthesis-git-sync`: Git Sync autosync queue behavior for service-level canonical store changes.

### Modified Capabilities

- `synthesis-layer-foundation`: Clarifies that Foundation canonical change events can be consumed by service-level autosync wiring.

## Impact

- Affects Synthesis service facade methods that write canonical KG assets.
- Affects Git Sync diagnostics/state handling for autosync notification failures.
- Adds focused tests around service-triggered autosync, pause/resume, conflict gate, and disabled adapter behavior.
