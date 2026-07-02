# Change: add-host-bridge-diagnostics-history-and-profile-inspect

## Why

Hermes and `zotero-librarian-profile` can now read context, write through safe mutations, monitor runs, and use the notification inbox. The remaining gap is operational visibility before and during workflow execution: agents need to know whether profiles, backends, permissions, recent runs, and cache/index state are healthy without using debug-only raw surfaces.

## What Changes

- Add redacted Host Bridge diagnostics endpoints for profile, backend list/status, workflow validation, and workflow requirements.
- Add read-only permission queue visibility.
- Add lightweight recent/history and skill-run events endpoints.
- Add canonical CLI commands under `bridge`, `workflow`, `run`, and `synthesis`.
- Add read-only synthesis cache/index status and an approval-gated, enum-scoped cache invalidation command.
- Update wrapper/profile semantic guidance and generated Host Bridge surface.

## Non-Goals

- No webhook subscription or callback delivery.
- No transcript, cursor, watch stream, or SSE.
- No CLI approve/reject for permission requests.
- No raw Zotero eval, SQL, arbitrary filesystem path, or table-name cache invalidation.
