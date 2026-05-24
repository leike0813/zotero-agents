## Why

Host Bridge CLI is now the primary ACP host access path, but the bridge service
is still started lazily and has no user-visible health signal in the ACP panels.
This leaves agent runs dependent on implicit startup timing and makes failures
hard to diagnose.

## What Changes

- Start Host Bridge with the plugin and stop it during plugin shutdown.
- Add Host Bridge supervision so unexpected socket stops or transient failures
  are retried without restoring MCP fallback behavior.
- Add a user-configurable fixed port option with automatic fallback to the
  existing random port range when the pinned port cannot be bound.
- Extend Host Bridge status snapshots with port mode and supervisor diagnostics.
- Show a Host Bridge indicator in ACP Chat and ACP Skills banner areas while
  keeping MCP indicators hidden from the normal status surface.

## Capabilities

### New Capabilities

- `host-bridge-lifecycle-and-status`: Host Bridge lifecycle, supervision,
  pinned-port behavior, and ACP panel status indication.

### Modified Capabilities

- `assistant-sidebar-ui`: ACP Chat and ACP Skills normal banner indicators now
  include Host Bridge service status and continue to omit MCP status.

## Impact

- Code:
  - Host Bridge server lifecycle and status snapshot.
  - Plugin startup/shutdown hooks and preferences UI.
  - ACP conversation/skill-run snapshots and assistant panel model.
- APIs:
  - `stateHostBridge` returns additional port/supervisor fields.
  - New Host Bridge pin port preferences are added.
- Security:
  - LAN remains disabled by default.
  - MCP remains explicit compatibility/diagnostic tooling only.
  - Status surfaces continue to avoid token and local-path disclosure.
