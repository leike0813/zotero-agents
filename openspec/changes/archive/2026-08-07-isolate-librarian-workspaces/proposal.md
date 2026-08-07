## Why

Zotero Librarian currently resolves every connection profile to one resident SQLite database and one CLI installation directory. Switching `ZOTERO_BRIDGE_PROFILE` can therefore expose another profile's index, workflow catalog, watched runs, notifications, and local executable; the service must make connection-profile identity part of its resident workspace routing.

## What Changes

- Add a shared profile/workspace resolver used by the resident service and installer.
- Keep the platform well-known profile on the existing default workspace and route explicit profiles to content-addressed workspace directories.
- Constrain `--db` to the selected workspace and fail closed on missing profiles, invalid paths, or workspace escape.
- Resolve the workspace once per service process, reuse one database for all operations, and pass explicit profile identity to every bridge invocation.
- Install explicit-profile CLI binaries inside that profile workspace; only the well-known profile may update the global well-known link.
- Regenerate profile distribution metadata, ignore rules, and materialized surfaces through the canonical renderer.
- Add agent guidance and focused regression coverage for isolation, migration ownership, and failure handling.
- Do not change the Host Bridge REST API, Rust CLI protocol, or `state.v3` schema.

## Capabilities

### New Capabilities

- `zotero-librarian-profile`: Profile identity, workspace routing, state isolation, and fail-closed diagnostics.
- `zotero-librarian-profile-distribution`: Installer, cron, generated profile, and runtime-artifact isolation.

### Modified Capabilities

None.

## Impact

The Python resident service and installer, profile configuration and documentation, the Host Bridge surface renderer, generated Hermes profile output, and focused TypeScript tests are affected. Existing receipt and SQLite schemas remain stable; the old well-known database remains the default profile's state.
