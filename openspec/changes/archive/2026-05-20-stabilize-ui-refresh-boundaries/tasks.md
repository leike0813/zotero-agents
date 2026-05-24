# Tasks

- [x] Create OpenSpec proposal, design, tasks, and delta specs.
- [x] Add assistant reply baseline tests for enabled open-text, disabled busy,
  choice buttons, permission actions, and stable textarea identity.
- [x] Add Synthesis Workbench and workflow settings baseline tests for active
  input, custom select, submit/cancel, and scroll preservation behavior.
- [x] Update shared assistant panel renderer so reply regions use structural
  signatures and live-field updates.
- [x] Update ACP Skills selected-run rendering so other run updates do not
  replace the active composer.
- [x] Harden Synthesis Workbench snapshot rendering around search/filter inputs
  and scroll containers without changing workbench actions.
- [x] Harden workflow settings dialog refresh behavior around active fields and
  custom selects without changing serialization or validation.
- [x] Audit Dashboard and dialog/tab host shells, fixing recurring active-UI
  rebuilds and documenting low-risk mount-only rebuilds.
- [x] Run targeted UI tests, `git diff --check`, and
  `openspec validate stabilize-ui-refresh-boundaries --strict`.
