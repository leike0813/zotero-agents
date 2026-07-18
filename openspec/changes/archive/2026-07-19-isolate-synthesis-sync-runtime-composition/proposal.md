## Why

The Synthesis application service still constructs prefs-backed Git/WebDAV runtimes, reads WebDAV credentials, and exposes ten configuration/status/secret methods that have no real consumer. This keeps Host preferences, credential storage, subprocess, and network ownership inside the application boundary even though Preferences already owns configuration UX and invalidation.

## What Changes

- Add explicit Git runtime binding and WebDAV Host remote-operation port seams with disabled fallbacks.
- Move prefs reads, credential access, default Git adapter construction, URL construction, and default WebDAV HTTP client ownership into production composition adapters.
- **BREAKING** Remove ten unconsumed Git/WebDAV configuration, credential, status, and connection-test methods from the complete service surface.
- Keep Preferences hooks as the only configuration owner and preserve all existing `SynthesisClient.sync` runtime commands and projections.
- Make missing bindings stable disabled states with no implicit prefs, fetch, credential, or subprocess fallback.

## Capabilities

### New Capabilities

- `synthesis-sync-runtime-composition`: Defines Git runtime binding, WebDAV Host port, production/readonly composition ownership, disabled behavior, and the reduced complete-service inventory.

### Modified Capabilities

- `synthesis-git-sync`: Moves prefs-configured runtime construction from the default application service into the production composition while preserving hidden/deprecated Git runtime behavior and WebDAV durable-sync semantics.

## Impact

- Affects Synthesis contracts, Git/WebDAV sync construction, the application service, legacy/readonly composition, service inventory, focused Core tests, and current-state Synthesis documentation.
- Reduces the complete service from `125 methods / 1 direct consumer` to `115 / 1` without changing the `SynthesisClient.sync` contract, Workbench/Preferences UI, durable bundle formats, database schema, remote layout, or conflict workflow.
- Adds no dependency and does not retire Git Sync, activate a sidecar process, publish, archive, or commit the change.
