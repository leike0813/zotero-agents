# Design: Workspace Toolbar Running Tasks Popover

## Data Source

The popover uses the same active task filtering as Dashboard. The filtering is
extracted into a shared helper so Dashboard and toolbar cannot drift.

The shared helper excludes:

- pass-through backend tasks;
- ACP skill runs that are removed or archived;
- terminal ACP skill runs;
- ACP skill task rows that lack a request id or no longer match a visible ACP
  run.

## Toolbar Behavior

The Workspace toolbar button keeps its click behavior: it opens the Zotero
Skills Workspace.

The popover is auxiliary:

- opens after a short hover/focus delay;
- closes after a short leave/blur delay;
- closes on Escape;
- refreshes while open when workflow task or ACP skill run state changes.

## Popover Content

The popover shows at most six tasks. Each task row contains task title,
workflow label, backend/status, and a compact updated time. There is no footer
button.

Clicking a row reuses existing navigation:

- ACP skill run rows open the unified Assistant Workspace on ACP Skills;
- SkillRunner rows open the unified Assistant Workspace on SkillRunner;
- other rows open the Dashboard view.

## Styling

The popover is a compact chrome-level surface with light and dark mode styling,
bounded width, ellipsized long text, and clear hover/focus feedback.
