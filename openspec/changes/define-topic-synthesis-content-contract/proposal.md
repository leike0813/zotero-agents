# Define Topic Synthesis Content Contract

## Why

Topic Synthesis currently has a stable structured artifact shell, but several
sections can pass validation with shallow list-like content. This weakens both
Workbench reading and downstream manuscript/review writing workflows.

## What Changes

- Define a stricter content contract for the existing topic synthesis sections.
- Keep current machine section names while upgrading their semantics:
  `taxonomy` becomes research-route analysis, `timeline_events` becomes
  historical progression analysis, and `claims` becomes argued cross-paper
  findings.
- Add `statistics` and `synthesis_report` as first-class sections.
- Require external literature analysis to include coverage judgment and
  suggested library additions.
- Update create/update topic synthesis skill instructions, runtime checks, and
  tests to reject empty-shell outputs.

## Impact

- Affects Topic Synthesis structured artifact validation and both create/update
  skill packages.
- Does not change Zotero canonical storage layout beyond the materialized
  section set.
- Does not redesign Workbench UI in this change.
