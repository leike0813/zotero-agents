## Why

Hidden Git Sync was never released, but its runtime, credentials, preferences,
service API, Workbench projection, tests, and documentation still increase the
Synthesis maintenance and security surface. WebDAV already provides the visible
durable-bundle transport, so retaining a second hidden transport has no product
value and leaves canonical-write autosync and recovery attached to dead code.

## What Changes

- **BREAKING** Delete the complete Git Sync runtime, command adapter,
  preferences, credential storage, service methods, client commands, Workbench
  projection, tests, and help content without compatibility shims.
- Make WebDAV the only Synthesis durable-sync transport and identify newly
  exported durable manifests with `webdav-sync.v1` while keeping schema/hash
  based imports transport-neutral.
- Move canonical-write autosync to WebDAV with default-off configuration,
  maintenance-epoch coalescing, a five-second debounce, and bounded automatic
  retry delays of 60 seconds, 5 minutes, 15 minutes, and 30 minutes.
- Cancel pending debounce/retry work on pause, disablement, conflict, terminal
  failure, or composition invalidation; do not restore hidden timers at startup.
- Add idempotent startup cleanup limited to the two plugin-managed Git runtime
  directories and nine Git Sync preference keys.
- Reduce the complete Synthesis service inventory from `115 methods / 1 direct
  consumer` to `108 / 1` and keep `SynthesisClient.sync` WebDAV-only.
- Rewrite active specs and documentation as WebDAV current state, including
  Foundation import, tag autosync, recovery, persistence, and Workbench behavior.

## Capabilities

### New Capabilities

- `synthesis-webdav-durable-sync`: Defines WebDAV-only durable bundle exchange,
  canonical-write autosync, bounded retry, cancellation, conflict gates, and
  transport retirement cleanup.

### Modified Capabilities

- `synthesis-git-sync`: Removes every Git-specific runtime and durable-sync
  requirement because the unpublished transport is retired completely.
- `synthesis-git-sync-ui`: Removes the obsolete Git-specific negative UI
  requirement together with the retired capability.
- `synthesis-incremental-update-triggers`: Routes maintenance-epoch autosync to
  WebDAV and keeps projection/job writes excluded.
- `synthesis-layer-foundation`: Makes durable import transport-neutral and
  WebDAV-owned.
- `synthesis-sync-recovery`: Defines recovery and retry only for WebDAV.
- `synthesis-tag-vocabulary`: Routes successful canonical tag writes to WebDAV
  autosync.
- `synthesis-workbench-ui`: Removes Git commands/projections and keeps the Sync
  surface WebDAV-only.
- `synthesis-persistence-performance`: Names WebDAV bundles as the only durable
  export allowlist.
- `synthesis-layer-doc-system`: Requires active documentation to describe only
  WebDAV durable sync and to remove Git Sync history.

## Impact

- Affects Synthesis contracts, service composition, WebDAV runtime,
  canonical-write notifications, lifecycle hooks, preferences, persistence
  integrity, Workbench host/app/i18n, readonly harnesses, and Core tests.
- Deletes five Git runtime/config modules and all multilingual Git Sync help
  pages; adds one bounded cleanup module and a WebDAV-only runtime fallback.
- Does not change the database schema, durable bundle schema, WebDAV credentials
  or manual commands, conflict interaction, sidecar activation, or the final
  full-service consumer.
- Does not access or mutate remote Git repositories, parse stored remote URLs,
  or delete paths outside the two fixed plugin-managed runtime directories.
