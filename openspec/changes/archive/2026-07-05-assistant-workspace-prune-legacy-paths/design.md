# Design

Assistant Workspace now has a reliable explicit handshake, so cleanup should
remove fallback-style triggers and leave a smaller set of lifecycle sources.

## Host lifecycle

`postShellMessage()` should only deliver the requested message. It should not
schedule handshake retries as a side effect of ordinary snapshot posts. The
handshake remains owned by explicit bridge/install/retry boundaries.

ACP Chat backend refresh is restricted to explicit backend lifecycle points:
startup preload, first shell-ready boundary when still needed, backend manager
return, and manual backend switch. Shell load and tab switch are presentation
events and must not refresh ACP Chat backends.

The generic ACP frontend snapshot subscription keeps attention/metadata
responsibility only. Panel publication is owned by typed ACP Chat, typed ACP
Skills, and SkillRunner runtime change paths.

## Init dedupe

Target commit publishes the baseline init set for the current shell/target
scope. Later shell-ready or child-ready events for the same scope should record
readiness but should not rebuild the same init snapshots. Scope resets clear the
dedupe markers so a new shell or target still initializes normally.

Tab switches are not baseline init duplicates: they remain foreground
presentation events and continue to publish the active tab snapshot.

## SkillRunner action cleanup

Selecting a task closes the drawer locally for responsiveness and sends one
`select-task` action to the host. The host closes its SkillRunner drawer chrome
as part of handling that selection, avoiding the previous `close-drawer` plus
`select-task` double action.
