## REMOVED Requirements

### Requirement: Git Sync waits for canonical maintenance epochs
**Reason**: Git Sync is retired; WebDAV owns maintenance-epoch autosync.
**Migration**: Use `synthesis-webdav-durable-sync`.

### Requirement: Projection and job state do not trigger Git Sync
**Reason**: The Git trigger no longer exists.
**Migration**: Projection and job state remain excluded from WebDAV autosync.

### Requirement: Git Sync uses an isolated adapter and worktree
**Reason**: The Git adapter and worktree are deleted.
**Migration**: Use the semantic WebDAV Host port.

### Requirement: Git Sync exports only allowlisted canonical assets
**Reason**: Git export is removed.
**Migration**: WebDAV exports the durable bundle allowlist.

### Requirement: Git Sync validates imports before promotion
**Reason**: Git import is removed.
**Migration**: WebDAV uses the transport-neutral durable importer.

### Requirement: Git Sync has a single-worker queue and lock
**Reason**: The Git queue and lock are removed.
**Migration**: Use WebDAV runtime serialization and gates.

### Requirement: Conflict gate blocks unsafe remote import
**Reason**: This Git-owned requirement is superseded.
**Migration**: The WebDAV durable-sync capability owns the conflict gate.

### Requirement: Git Sync diagnostics are sanitized
**Reason**: Git diagnostics no longer exist.
**Migration**: WebDAV Host and runtime diagnostics remain sanitized.

### Requirement: Git Sync actions surface queue state in Workbench
**Reason**: Git Workbench actions and state are removed.
**Migration**: Use WebDAV Sync actions.

### Requirement: Git Sync import validates canonical assets
**Reason**: Git import is removed.
**Migration**: WebDAV validates durable bundles before apply.

### Requirement: Git Sync imports canonical assets through one Foundation transaction
**Reason**: Git import is removed.
**Migration**: WebDAV import uses the Foundation transaction boundary.

### Requirement: Git Sync uses persistent sync locks
**Reason**: Git runtime locks are removed.
**Migration**: WebDAV runtime state owns synchronization gates.

### Requirement: Git Sync debounces canonical store change notifications
**Reason**: Git autosync is removed.
**Migration**: WebDAV coalesces canonical maintenance epochs.

### Requirement: Git Sync preserves affected conflict assets
**Reason**: Git conflict state is removed.
**Migration**: WebDAV conflict state preserves affected assets.

### Requirement: Service-level canonical writes enqueue Git Sync autosync
**Reason**: Canonical autosync is transferred to WebDAV.
**Migration**: Schedule WebDAV after the canonical write lock is released.

### Requirement: Autosync respects queue gates
**Reason**: The Git autosync queue no longer exists.
**Migration**: WebDAV debounce and retry respect runtime gates.

### Requirement: Autosync notification failures are best-effort
**Reason**: The Git notification hook is removed.
**Migration**: WebDAV autosync remains best-effort after canonical commit.

### Requirement: Git Sync can use a prefs-configured Git command adapter
**Reason**: The Git command adapter and preferences are deleted.
**Migration**: Configure WebDAV through Preferences.

### Requirement: Git Sync token prefs are encrypted
**Reason**: Git token preferences are deleted.
**Migration**: WebDAV credential storage is unchanged.

### Requirement: Git Sync connection test is non-mutating
**Reason**: The Git connection test is deleted.
**Migration**: Use the WebDAV connection test.

### Requirement: Git Sync initializes empty remotes on first sync
**Reason**: Git remote initialization is deleted.
**Migration**: WebDAV publishes immutable snapshots and HEAD.

### Requirement: Git Sync retries transient failures with backoff
**Reason**: Git retry scheduling is deleted.
**Migration**: WebDAV uses its bounded four-delay retry chain.

### Requirement: Git Sync command diagnostics are sanitized
**Reason**: Git command execution is deleted.
**Migration**: WebDAV diagnostics remain sanitized.

### Requirement: Git Sync credentials are not stored in remote URLs
**Reason**: Git remotes and credentials are deleted.
**Migration**: WebDAV Host composition continues to own credentials.

### Requirement: Git Sync exchanges durable Synthesis state assets
**Reason**: Git durable exchange is deleted.
**Migration**: WebDAV is the only durable exchange transport.

### Requirement: Durable assets use stable envelopes and manifest hashes
**Reason**: This generic durable rule is moved out of the removed Git capability.
**Migration**: The WebDAV durable-sync capability preserves envelopes and hashes.

### Requirement: Durable import is validate-preview-apply
**Reason**: This generic durable rule is moved out of the removed Git capability.
**Migration**: WebDAV import remains validate-preview-apply.

### Requirement: Durable conflict gate blocks unsafe three-way merges
**Reason**: This generic durable rule is moved out of the removed Git capability.
**Migration**: WebDAV owns the durable conflict gate.

### Requirement: Durable sync exposes explicit conflict resolution actions
**Reason**: This generic durable rule is moved out of the removed Git capability.
**Migration**: WebDAV state exposes supported conflict actions.

### Requirement: Git Sync worktree is isolated from existing repositories
**Reason**: The Git worktree is deleted.
**Migration**: No replacement worktree exists.

### Requirement: Direct launcher provides safe runtime root
**Reason**: The Git launcher path is deleted.
**Migration**: Runtime root continues to be supplied to plugin-owned services.

### Requirement: WebDAV sync uses durable bundle snapshots
**Reason**: WebDAV behavior does not belong in the removed Git capability.
**Migration**: The requirement moves to `synthesis-webdav-durable-sync`.

### Requirement: Git Sync is a deprecated hidden transport
**Reason**: Git Sync is deleted, not retained as deprecated code.
**Migration**: No compatibility surface is provided.

### Requirement: Synthesis live SQLite files SHALL remain local-only
**Reason**: This generic durable rule is moved out of the removed Git capability.
**Migration**: WebDAV durable bundles continue to exclude live SQLite files.

