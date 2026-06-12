# Design

## Entry Point

The Assistant Sidebar entry is represented by the toolbar sidebar button in the Zotero library UI and by the sidebar button in the Workbench header. These are the places users can see while deciding whether to open the Assistant Sidebar. The side-pane buttons inside Zotero's item/reader panes do not own task attention indicators or active task popovers.

The Workbench launch button remains a command launcher. It does not mirror task attention and does not host the active task popover.

## Badge Semantics

The badge count is the human-attention count:

- SkillRunner workflow tasks in `waiting_user` or `waiting_auth`.
- ACP Skills runs in `waiting_user`, `waiting_auth`, or with `pendingPermission`.

Running, queued, submitted, completed, failed, canceled, and ordinary ACP Chat state are not counted.

## Popover Semantics

The existing active task popover remains the active task popover. It continues to read rows through `listDashboardActiveTasksForPopover`, show all active tasks, and route row activation through the existing Assistant workspace/Dashboard entrypoints.

The migration changes only the anchor: the popover attaches to Assistant Sidebar entry surfaces instead of the Workbench launch button. The Workbench header sidebar button reuses the same popover helper and data source as the Zotero library toolbar sidebar button.

## Lifecycle

Each mounted sidebar entry installs its own popover runtime. Removing the toolbar entry, reloading the Workbench frame, or closing the Workbench tab uninstalls its corresponding runtime. Workbench tab cleanup also removes task subscriptions used to keep the Workbench badge in sync.
