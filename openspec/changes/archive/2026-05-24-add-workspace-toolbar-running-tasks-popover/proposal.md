# Change: Add Workspace Toolbar Running Tasks Popover

## Why

The Workspace toolbar button opens the main Zotero Skills workspace, but users
currently need to open Dashboard to check what is running. A lightweight hover
popover can expose the same active task information at the toolbar level without
turning the toolbar into a full task manager.

## What Changes

- Add a hover/focus popover to the `Open Zotero Skills Workspace` toolbar
  button.
- Show a compact list of current active tasks using the same visibility rules as
  Dashboard's running task list.
- Keep the toolbar button click behavior unchanged.
- Let task rows jump to the existing Assistant Workspace or Dashboard routes.
- Add styles and localized copy for the popover.

## Non-Goals

- No footer action or `View all` button in the popover.
- No new task state source.
- No replacement for Dashboard's full running task table.
- No change to workflow execution, task persistence, or Assistant panel
  protocol.
