## Design

Synthesis canonical domain services continue to own canonical transactions. This change only wires the `SynthesisService` facade to call Git Sync after those transactions have succeeded.

The service will use a small helper around write-locked canonical mutators:

- run the canonical mutation under the existing library write lock
- release the lock
- if the operation result represents a successful canonical write, call `gitSync.notifyCanonicalStoreChanged()`
- if notification fails, record a sanitized Git Sync diagnostic and return the original successful result

This keeps Git Sync best-effort and avoids holding the service write lock while a debounced sync worker is queued.

## Covered Mutators

Autosync notification applies to service methods that write canonical Synthesis KG assets:

- tag vocabulary save/import
- concept display-text edits
- topic synthesis apply and topic delete paths that update Concept KB or Topic Graph canonical assets
- literature registry rebuild
- cleanup proposal action

Projection rebuild-only methods remain excluded because `state/` projection output is intentionally not exported by Git Sync.

## Failure Handling

Notification failure is not a canonical transaction failure. The canonical write remains committed, and Git Sync records a sanitized diagnostic with code `git_sync_autosync_notify_failed`.

Disabled, paused, locked, or conflict-blocked Git Sync keeps existing semantics:

- disabled adapter: no queue/run
- paused: queue only, run on resume
- blocked conflict: do not force import or overwrite the conflict gate
- lock: worker respects the persistent sync lock

## Out of Scope

- Real Git CLI or remote adapter
- Credential UI or remote setup
- Main spec archive/sync
- SQLite/FTS projection backend
- Autosync for direct calls to lower-level domain services outside `SynthesisService`
