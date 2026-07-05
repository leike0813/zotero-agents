## Design

Assistant Workspace host runtime owns shell bridge state, child readiness, and
SkillRunner sidebar attachment. These lifecycle surfaces are level-triggered,
so repeated events must be harmless and must not rebuild snapshots unless the
underlying scope or child payload changed.

## Bridge Idempotency

The host stores the shell window and bridge instance that were last installed.
`installShellBridge(host)` resolves the current shell frame window and returns
without writing bridge fields when that same bridge is already installed on the
same window. When the shell frame changes, previous bridge fields are cleared,
the stored bridge marker is reset, and a new bridge is installed once.

`publishAssistantWorkspaceStatePulse()` no longer installs the bridge directly.
Bridge installation remains at message delivery and handshake boundaries.

## Ready Idempotency

Child ready is first-ready only for each current host scope. A duplicate ready
for a tab is logged as duplicate and acknowledged, but it does not publish a new
init snapshot. Scope/target/shell reset clears `readyTabs`, preserving correct
initialization after a real lifecycle change.

## SkillRunner Sidebar Publish

SkillRunner runtime snapshots are split into base and decorated forms. Runtime
refreshes update the latest base snapshot, decorate it with workspace chrome,
and publish it. Drawer/collapse changes are host-only chrome changes; they
reuse the latest base snapshot and publish one newly decorated child snapshot
without calling the SkillRunner runtime presentation refresh path.

SkillRunner sidebar attachment is keyed by the current shell frame window. A
repeat attach for the same window is a no-op; detach and shell-window changes
clear the marker.
