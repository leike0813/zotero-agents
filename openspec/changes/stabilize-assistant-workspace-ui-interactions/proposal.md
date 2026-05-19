# Stabilize Assistant Workspace UI Interactions

## Why

High-frequency ACP and SkillRunner updates currently cause several user-visible
UI regressions: workspace activity can split active streaming output, assistant
drawers are rebuilt while the user is interacting with them, workspace/sidebar
routing is inconsistent, and ACP Skills reconnect/running state can leave the
composer in the wrong state.

The same update pressure also resets animations outside the conversation window
because shared panel regions are cleared and rebuilt on every snapshot.

## What Changes

- Preserve streaming transcript continuity when workspace activity arrives
  during an active ACP Skills turn.
- Make shared assistant drawers and panel regions stable under frequent
  timestamp-only updates.
- Keep composer semantics consistent for running, waiting, reconnecting, and
  terminal ACP Skills states.
- Reopen the unified assistant sidebar when the workspace tab is opened from an
  already-open sidebar state.
- Route Dashboard running-task clicks directly to the unified sidebar and the
  selected ACP Skills run.
- Rename the Synthesis action from "Run synthesis" to "Create Topic".

## Non-Goals

- No ACP protocol changes.
- No MCP transport changes.
- No replacement of the existing assistant shell or Synthesis Workbench
  architecture.
