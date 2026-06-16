# Add WebDAV Durable Bundle Sync

## Why

Git Sync provides an inspectable durable-state exchange path, but it is heavy for ordinary cross-device synchronization. A lighter transport should reuse the existing durable bundle import/export contract without synchronizing the live SQLite database.

## What Changes

- Add WebDAV Sync as an experimental manual Synthesis sync transport.
- Store WebDAV configuration in Zotero preferences and credentials in encrypted prefs.
- Upload and download durable bundle snapshots through WebDAV.
- Keep SQLite as a local materialized store and never upload the live database, WAL, SHM, runtime, cache, or projection files.
- Surface WebDAV Sync status and manual actions in Workbench next to Git Sync.

## Non-Goals

- Do not replace Git Sync.
- Do not reuse Zotero file-sync WebDAV credentials automatically.
- Do not synchronize live SQLite files.
- Do not compress bundles, garbage-collect old remote snapshots, or implement field-level merge in v1.
