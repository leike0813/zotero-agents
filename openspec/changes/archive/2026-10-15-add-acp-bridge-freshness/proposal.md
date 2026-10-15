# Proposal

## Why

Windows ACP bridge currently has only a binary checksum, leaving build preflight unable to establish whether it matches current source. Successful preflight also leaves the plugin build as a separate manual step.

## What Changes

- Bind Windows bridge builds to content fingerprints and binary checksums, verifying unchanged inputs before issuing build evidence.
- Add a read-only JSON freshness command and require packaging to preserve verified build evidence.
- Connect the command to build preflight and automatically build once all preparation passes, respecting explicit check-only or preparation-only requests and existing outer build flows.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-windows-websocket-bridge`: source-bound native build evidence and freshness verification.

## Impact

ACP-specific Node build/package scripts, package scripts, existing ACP packaging tests, generated Windows bridge assets, preflight skill and project build instructions. No runtime protocol, dependencies, release surfaces or Git operations change.
