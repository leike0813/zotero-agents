## Why

Synthesis currently becomes unusable when one oversized Zotero note aborts the Index read, when mixed legacy literature notes are all classified as unsupported, and when the first Topic Report render loses its Markdown body during an unrelated Preact refresh. These failures block normal reading and migration workflows in real libraries.

## What Changes

- Keep bounded note payload failures local to the affected artifact descriptor so the Synthesis Index can still open.
- Upgrade literature artifact migration to definition version 3, preserving known non-target managed payloads while migrating References and Citation artifacts.
- Replace the unbounded migration candidate projection with a paged, scrollable, selectable Dashboard view whose review candidates require explicit opt-in.
- Give Preact stable ownership of Topic Report layout containers and isolate imperative Markdown rendering from unrelated Reader updates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-host-artifact-read-port`: A resource-limited child note produces bounded decode diagnostics instead of failing the complete artifact page.
- `literature-artifact-migration`: Known non-target managed payloads are preserved, and Dashboard migration selection is bounded and explicit.
- `synthesis-workbench-ui`: Topic Report content and scroll containers survive unrelated Reader refreshes from the first open.

## Impact

The change affects the Zotero Host Broker note-detail error boundary, the Synthesis library adapter, the process-local migration runtime and Dashboard wire projection, migration localization and styling, and the Topic Report Markdown island. The migration definition version changes from 2 to 3. No Rust sidecar, database schema, dependency, or remote API changes are required.
