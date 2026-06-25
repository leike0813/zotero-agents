# Design: WebDAV Durable Bundle Sync

WebDAV Sync reuses the durable bundle format already produced by Synthesis durable export. The remote WebDAV tree stores immutable-ish snapshots and a small current pointer.

## Remote Layout

- `<remotePath>/HEAD.json`
- `<remotePath>/snapshots/<snapshotId>/manifest.json`
- `<remotePath>/snapshots/<snapshotId>/bundles/**`

`HEAD.json` records `snapshot_id`, `manifest_hash`, `updated_at`, and `producer_version`. Snapshot files are uploaded before `HEAD.json`; v1 does not delete old snapshots.

## Sync Flow

Manual sync loads remote HEAD if present. If a snapshot exists, it downloads manifest and bundles into a local import root, validates through durable import preview, and applies only when no blocking conflict exists. It then exports the current durable store, uploads bundles and manifest, and finally updates HEAD.

If remote HEAD changes between read and update, sync stops with `webdav_sync_remote_changed_during_sync`. Missing HEAD is initializable.

## Configuration

Preferences own WebDAV enabled state, base URL, remote path, username, auto sync, auto retry, credential mask, and connection test. Credential plaintext is never returned after saving.

## Conflict Model

Conflict detection stays entity-based through durable manifest entry hashes and the local durable sync index. v1 uses conservative conflict actions and does not perform field-level merge or last-writer-wins.
