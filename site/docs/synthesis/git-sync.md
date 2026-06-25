# Git Sync

:::warning Deprecated

Git Sync has been deprecated in the current version and is no longer available externally. The plugin has switched to **WebDAV Durable Bundle Sync**, which uses the WebDAV protocol to exchange Synthesis persistence state snapshots (instead of Git repositories) for lighter-weight cross-device sync.

**Please use [WebDAV Sync](webdav-sync) instead.**

Git Sync is retained only as an implicit internal transport channel (used for historical diagnostics and future cleanup). The documentation below is kept for historical reference.

:::

Git Sync is an optional feature of Synthesis Workbench that synchronizes knowledge graph data from the Canonical Store to a Git repository, enabling version control, backup, and collaboration.

## Use Cases

- **Version Control**: Track change history for all tag vocabularies, topic syntheses, and concept knowledge base
- **Backup**: Back up structured knowledge data to a remote Git repository
- **Collaboration**: Multiple researchers share the same tag system and analysis results

## Configuration

Configure Git Sync in Zotero Preferences:

Zotero → Settings → Zotero Agents → Synthesis Git Sync

| Setting | Description |
|---------|-------------|
| **Enable Git Sync** | Turn sync on/off |
| **Remote Repository URL** | Git remote repository address (supports HTTPS and SSH) |
| **Branch Name** | Git branch used for sync |

### Prerequisites

- Git installed (available in system PATH)
- An accessible Git remote repository (GitHub, Gitee, self-hosted, etc.)
- If using an HTTPS repository, Git credentials must be configured

## Sync Scope

Git Sync only synchronizes **canonical domain assets** (structured knowledge data in the Canonical Store), excluding runtime data.

### What Is Synced

| Domain | Content |
|--------|---------|
| `tags/` | Controlled tag vocabulary |
| `topics/` | Structured artifacts for topic synthesis |
| `concepts/` | Concept knowledge base (concepts, senses, aliases, relationships) |
| `topic-graph/` | Topic graph nodes and edges |
| `citation-graph/` | Citation graph snapshots |

### What Is Not Synced

| Not Synced | Reason |
|------------|--------|
| `state/` databases | SQLite runtime state; can be rebuilt from canonical assets |
| Runtime logs | Temporary diagnostic data |
| Workspace files | Temporary data generated during execution |
| Queue and lock state | Internal scheduling state |

## Sync State Machine

The sync system uses a queue-driven state machine to ensure consistency:

```
idle → queued → syncing → idle
                  ↓
            blocked_conflict
                  ↓
            failed_retryable / failed_permanent / disabled
```

| State | Description |
|-------|-------------|
| `idle` | Idle, no pending tasks |
| `queued` | Changes pending sync |
| `syncing` | Sync operation in progress |
| `blocked_conflict` | Sync failed; conflicts require manual resolution |
| `failed_retryable` | Temporary failure (e.g., network issues); retryable |
| `failed_permanent` | Permanent failure (e.g., configuration error) |
| `disabled` | Git Sync is turned off |

## Conflict Handling

Conflicts arise when both local and remote have unmerged changes.

### Conflict Report

The conflict report lists:

- **Conflicting file paths**
- **Local version hash**
- **Remote version hash**
- **Conflict reason** (e.g., both sides modified the same tag simultaneously)

### Resolution Steps

1. View the conflict report in the Git Sync panel on the Home page
2. Analyze the conflict content (file-level granularity)
3. Decide whether to keep the local version, the remote version, or manually merge
4. After completing the merge, commit the changes

## Best Practices

### Regular Sync

Git Sync is not real-time sync. It is recommended to:

- Manually trigger sync after completing a batch of tag management or topic modifications
- Or monitor sync status on the Home page to ensure the queue does not back up

### Team Collaboration

When multiple people share the same tag vocabulary:

- It is recommended to designate a dedicated person for vocabulary management
- After tag changes propagate via Git Sync, other members perform a sync pull
- Resolve conflicts through negotiation

### Backup Strategy

- Git Sync supplements the Canonical Store as an additional backup; it does not replace backing up the Zotero data itself
- It is recommended to regularly push the Git repository to the remote (built-in support)
- The initial sync may take a long time; subsequent syncs are incremental

## Next Steps

- [Home Dashboard](home) — View the sync status panel
- [Tags Management](tags) — Manage the controlled tag vocabulary
- [Preferences](../preferences) — Configure Git repository parameters
