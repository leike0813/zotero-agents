## Why

Git Sync has canonical transactions, locks, conflict gates, and service-level autosync, but production service instances still stay disabled because no real adapter is configured. Failed sync runs also require manual retry, so transient remote failures can leave canonical exchange stale.

## What Changes

- Add a production Git command adapter behind prefs-only configuration.
- Store Git remote token material as an encrypted prefs envelope with no plaintext fallback.
- Wire the default Synthesis service to create the adapter only when prefs are complete and enabled.
- Add automatic retry/backoff for retryable Git Sync failures.
- Preserve existing safety boundaries: no credential UI, no multi-remote support, no SQLite sync, no hosted sync service.

## Capabilities

### New Capabilities

- `synthesis-git-sync`: Git command adapter, encrypted token prefs, and retry/backoff behavior for the existing Git Sync capability.

### Modified Capabilities

- `synthesis-layer-foundation`: Clarifies that Git adapter exchange remains outside canonical store source-of-truth semantics.

## Impact

- Adds Synthesis Git Sync prefs and token helper code.
- Adds a plugin-safe Git command adapter using the existing subprocess compatibility layer.
- Extends Git Sync state and receipts with retry scheduling metadata.
- Affects default Synthesis service construction and focused Git Sync tests.
