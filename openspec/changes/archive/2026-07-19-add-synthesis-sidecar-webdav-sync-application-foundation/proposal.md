## Why

The isolated Synthesis sidecar can now export, verify, preview, and atomically apply its complete durable corpus, but WebDAV snapshot orchestration remains a 1,000-line plugin-local service coupled to plugin runtime files. The final WS5 priority-7 slice must establish one environment-neutral WebDAV application and a private sidecar composition without moving credentials, production persistence, or public routing.

## What Changes

- Add strict shared WebDAV snapshot, state, conflict, progress, persistence-port, durable-port, and scheduler contracts.
- Add an environment-neutral WebDAV application for remote HEAD discovery, lazy durable import, deterministic snapshot publication, conflict gates, bounded retry, cancellation, admission stop, and shutdown drain.
- Add an identity-bound Node state adapter and compose the application privately after durable import recovery with a disabled Host port.
- Reduce production `webDavSync.ts` to a compatibility composition over the shared application while preserving public DTOs, commands, progress, remote layout, preferences, credentials, HTTP behavior, and Host port shape.
- Keep unbased updates policy-owned: the private sidecar defaults to explicit acknowledgement while production injects its current legacy acknowledgement policy.
- Add no HTTP/RPC, worker operation, `SynthesisClient`, Workbench, Host Bridge, MCP, production database, production canonical-root, or credential capability.

## Capabilities

### New Capabilities

- `synthesis-sidecar-webdav-sync-application-foundation`: Defines strict remote snapshot orchestration, durable import/export coordination, state recovery, conflicts, retry/cancellation, lifecycle, private composition, and production compatibility.

### Modified Capabilities

None. The production WebDAV durable-sync requirements and public surfaces remain unchanged.

## Impact

The change affects shared Synthesis contracts and application packages, the Node service composition and runtime packaging, the production WebDAV compatibility module, focused Core tests, migration inventories, and current-state Synthesis documentation. It adds no dependency, public route, release prebuild, production migration, or remote credential transfer.
