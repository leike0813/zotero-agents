## Why

Several plugin UI surfaces receive live snapshots from polling, worker progress,
or streaming backend activity. When those updates rebuild the whole visible
pane, users lose scroll position, expanded rows, focused inputs, and graph
camera state. This has repeatedly affected the Synthesis Workbench Index and
Citation Graph tabs.

## What Changes

- Add a repository-wide UI rendering stability contract.
- Split Synthesis Workbench snapshot handling into content signatures and
  chrome/status signatures.
- Patch statusbar/background task changes without rebuilding the active content
  tab.
- Preserve keyed scroll, focused controls, expanded details, and graph camera
  state across required full renders.
- Add tests that prevent full snapshot comparisons and unconditional graph
  teardown from re-entering live UI render paths.

## Impact

- Affected source: Synthesis Workbench app and focused UI contract tests.
- Additive documentation and OpenSpec only; no persistence or workflow protocol
  change.
- No UI framework rewrite and no new dependencies.

