## Design

The Assistant Workspace shell is the single delivery coordinator for child
panel snapshots. Host code may post child payloads only as
`assistant-workspace:child-snapshot`; the shell caches those payloads and
delivers them to the target child iframe using that tab's native child message
type.

SkillRunner remains special only at the child wire boundary: the workspace
shell still emits `skillrunner-sidebar:init` and
`skillrunner-sidebar:snapshot` into the SkillRunner iframe because
`run-dialog.html` is shared between standalone dialog mode and workspace
sidebar mode. The shell no longer accepts those messages as inbound snapshot
messages.

## Delivery Guard

Each cached payload receives a monotonically increasing shell-local generation.
The shell records successful deliveries by tab, phase, generation, and child
`contentWindow`. A replay attempt first checks that record. If the same cached
generation has already been delivered to the same frame window, the attempt is
treated as successful without posting again.

Retry scheduling is explicit:

- cache updates do not schedule replay on their own;
- callers replay immediately when they have a reason to deliver;
- failed delivery marks the tab pending and schedules retry;
- successful replay clears that tab from the pending set;
- scope changes clear cache, revision tracking, delivery records, and pending
  replay state.

## Runtime Boundary

Sidebar SkillRunner snapshots continue to originate from
`attachSkillRunnerSidebarHost({ publishSnapshot })` and return to the host.
Standalone dialog delivery remains owned by `run-dialog:*` messages outside the
workspace shell.
