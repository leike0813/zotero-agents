# Change: Optimize Workflow Menu Multi-Select Availability

## Why

Opening the workflow action menu currently preflights every visible workflow
against the current selection. With `N` selected items and `M` workflows, this
can trigger expensive filtering work before the user has chosen a workflow,
causing visible menu stalls.

## What Changes

- Keep precise availability checks for no-selection and single-selection menu
  states.
- For multi-selection, skip per-workflow request preflight while building the
  menu and render workflows as enabled by default.
- Preserve submit-time filtering and validation when the user actually chooses a
  workflow.

## Impact

- Specs: workflow menu behavior
- Code: workflow menu popup building
- Tests: workflow context menu tests
