## Why

The debug-only ACP Replay publication sidecar rejects valid Assistant Workspace snapshots in Zotero because a nested iframe `MessageEvent.source` may be absent or represented by a different privileged/Xray wrapper than the host-held shell window. Both `open-inactive` and `target-active` therefore time out before replay can complete even though the target tab and revision are correct.

## What Changes

- Treat absent message sources as unverifiable rather than mismatched while retaining tab, revision, child-window, and frame-lifetime validation.
- Compare non-null publisher windows across direct and `wrappedJSObject` identities, continuing to reject demonstrably unrelated publishers.
- Add production-shaped unit coverage and a Zotero nested-frame integration regression for ACP Chat and ACP Skills publication.
- Preserve the debug-exclusive sidecar boundary and keep ordinary Workspace and child render paths free of Replay acknowledgement plumbing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-runtime-replay-profiler`: Clarify valid publication-source evidence across Zotero privileged window wrappers and require real nested-frame acceptance coverage.

## Impact

The change is limited to the debug-only Replay publication sidecar, its tests, and current-state Replay documentation/specification. It changes no backend protocol, persisted artifact, public workflow contract, production Workspace hot path, dependency, or user data.
