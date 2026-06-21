# Design

## Foreground Panel SSOT

SkillRunner sidebar foreground state is built from one bounded snapshot builder.
The builder uses the same architectural shape as the ACP Skills panel:

- read active SkillRunner task summaries;
- read the most recent `RUN_WORKSPACE_PANEL_HISTORY_LIMIT + 1` lightweight
  SkillRunner history projections;
- truncate the visible list to `RUN_WORKSPACE_PANEL_HISTORY_LIMIT`;
- expose truncation metadata and a drawer notice;
- if the requested selected request is outside the recent window, read that
  request's lightweight projection exactly and insert it into the model;
- read full run/chat detail only for the selected request.

Drawer open/collapse state affects presentation only. It never controls whether
completed rows exist in the panel model.

## Canonical Identity

SkillRunner panel rows are merged by canonical identity:

1. `backendId + requestId`
2. `backendId + localRunId`
3. `backendId + taskId`

Rows with a request id suppress matching local/pre-request rows that share
`localRunId`, `runId`, `jobId`, or local task id. When two rows conflict, the
request row wins over the local row, terminal/newer projections win over stale
active records, and SkillRunner run-store projection status wins over stale
task-record state.

The visible `taskIndex` stores only canonical UI keys. Request and local lookup
maps are resolver indexes for entry parameters; they are not alternate rows in
the model.

## Runtime Consistency

`recordWorkflowTaskUpdate()` and SkillRunner projection merge prune stale
pre-request local rows when a request id becomes available for the same local
run identity.

`updateWorkflowTaskStateByRequest()` synchronizes terminal state through the
task record active index and SkillRunner projection scope so completed runs stop
appearing as active without requiring the sidebar to be closed and reopened.

## Sidebar Host Consistency

The Assistant workspace is the single sidebar host for SkillRunner, ACP Chat,
and ACP Skills. SkillRunner-specific behavior is gated by the active shell tab.

Toolbar and side-pane SkillRunner entrypoints always request
`tab: "skillrunner"`. If the Assistant sidebar is open on another tab, the
toolbar switches to SkillRunner instead of closing the sidebar. When switching
between library and reader targets, the old SkillRunner frame is detached before
attaching the new active target.

`openAssistantWorkspaceSidebar()` focuses SkillRunner only after the active pane
has been activated. It no longer pre-focuses a SkillRunner workspace before the
host frame exists.

## Background Isolation

Dashboard, attention badges, popovers, and background refresh ticks stay on
summary/active read paths. The bounded SkillRunner projection read is only a
foreground panel read, not a background Dashboard read.

Tests assert read/build shape rather than fixed timing thresholds.
