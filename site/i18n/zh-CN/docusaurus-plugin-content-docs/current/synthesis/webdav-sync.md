# WebDAV Sync

## Overview

WebDAV Sync is the cross-device synchronization mechanism for the Synthesis Workbench, replacing the deprecated Git Sync. It exchanges deterministic durable-state bundle snapshots via the WebDAV protocol.

Works with any WebDAV-compliant server (Nextcloud, ownCloud, Synology, etc.). No Git required.

## Prerequisites

- An accessible WebDAV server
- WebDAV credentials (username + password or app-specific token)

## Configuration

Zotero → Settings → Zotero Agents → WebDAV Sync

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| **Enable WebDAV Sync** | boolean | `false` | Master toggle |
| **Base URL** | string | `""` | WebDAV server URL, e.g. `https://nextcloud.example.com/remote.php/dav/files/user/` |
| **Remote Path** | string | `"zotero-agents"` | Remote directory under the base URL |
| **Username** | string | `""` | WebDAV username (optional) |
| **Password / App Token** | encrypted | `""` | Password or token (AES-256-GCM encrypted) |
| **Auto Sync** | boolean | `false` | Trigger sync automatically after Synthesis changes |
| **Auto Retry** | boolean | `false` | Retry transient failures automatically |

Action buttons:

- **Save Settings**: persist non-credential settings
- **Save Credential**: encrypt and store password/token
- **Test Connection**: send a PROPFIND request to verify connectivity

## Remote File Layout

```
<remotePath>/
├── HEAD.json                           # Current snapshot pointer
└── snapshots/
    └── <snapshotId>/
        ├── manifest.json               # Durable bundle manifest
        └── bundles/                    # Deterministic durable bundle files
```

**HEAD.json** contains `snapshot_id`, `manifest_hash`, `updated_at`, `producer_version`. Snapshots are fully uploaded before HEAD is updated — interrupted syncs never corrupt the remote.

## What Gets Synced

| Synced | Not Synced |
|--------|-----------|
| Topics | SQLite runtime databases |
| Concepts (concepts, senses, aliases, relations) | Runtime logs |
| Topic Graph (nodes, edges) | Workspace files |
| References (bindings, redirects) | Queue and lock state |
| Review items | Rebuildable projections (citation layout, metrics, cache) |
| Tags (controlled vocabulary) | Credentials |
| Related items | Temporary files |

## Sync Flow

```
idle → queued → syncing → idle
                 ├── blocked_conflict (manual resolution required)
                 └── failed_retryable / failed_permanent
```

| Step | Description |
|------|-------------|
| 1. HEAD | Read remote HEAD.json |
| 2. Download | Download manifest + bundles if a newer snapshot exists |
| 3. Preview | Validate the imported snapshot, compare entity hashes |
| 4. Conflict Check | Detect bilateral changes |
| 5. Apply | Import the remote snapshot into the local Canonical Store |
| 6. Export | Export current local state as bundles |
| 7. Upload | Upload manifest + bundles |
| 8. HEAD Update | Update HEAD.json last (ETag/If-Match for concurrency safety) |

## Conflict Handling

Conflict detection is based on entity-level hash comparison. A conflict is raised when the same entity changed both locally and remotely.

**Conflict types:**

- Bilateral entity modification
- Update vs. tombstone conflict
- Review item divergence
- Reference binding/redirect target divergence

**Resolution actions:**

| Action | Description |
|--------|-------------|
| `keep_local` | Keep local state, close conflict gate, queue next export |
| `clear_after_manual_edit` | After manual merge, re-validate; clear the conflict marker when resolved |

The Workbench Home page sync panel shows conflict details and action buttons.

## Security

- **Credential encryption**: AES-256-GCM, keyed to the Host Bridge master token (PBKDF2-SHA256, 100,000 iterations)
- **Plaintext never returned**: credential is not readable after saving
- **URL sanitization**: credentials are stripped from log output
- **HTTP Basic Auth**: standard Basic authentication over HTTPS

## Limitations

| Limitation | Detail |
|------------|--------|
| **Manual by default** | Auto-sync and auto-retry are off by default |
| **No compression** | v1 snapshots are raw JSON bundles |
| **No old snapshot cleanup** | Remote snapshots accumulate; manual cleanup required |
| **No field-level merge** | Conflicts are at the entity level |
| **Single-device assumption** | Concurrent writes from multiple devices may cause conflicts |

## Next Steps

- [Home dashboard](home) — view sync status
- [Preferences](../preferences) — configure WebDAV sync
- [Git Sync](git-sync) (deprecated) — historical reference
