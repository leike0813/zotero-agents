## REMOVED Requirements

### Requirement: Dashboard does not expose Git Sync UI

**Reason**: The never-released Git Sync transport and all of its state are
removed, so a Git-specific negative UI contract is no longer meaningful.

**Migration**: Workbench exposes only the WebDAV Sync projection and commands.

