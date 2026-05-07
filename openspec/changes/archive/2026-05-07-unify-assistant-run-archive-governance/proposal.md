# Unify Assistant Run Archive Governance

## Why

Assistant panel run/session lifecycle controls have drifted after the managed UI migration. ACP Chat has archive semantics, ACP Skills has UI removal through `removedAt`, and SkillRunner has visible task history without archive governance. The resulting UI makes `Cancel Run`, terminal run cleanup, and drawer item actions inconsistent across the three Assistant tabs.

This change defines one user-facing lifecycle model for Assistant drawers:

- `Cancel Run` is for non-terminal runs only.
- `Archive` is for terminal objects only.
- Archive removes the item from the default UI list while preserving persisted diagnostics and history.

## What Changes

- Add managed drawer item actions so context drawer rows can expose a right-side archive action without triggering item selection.
- Add archive actions to ACP Chat conversations, ACP Skills terminal runs, and SkillRunner terminal runs.
- Add persisted `archivedAt` markers for ACP Skills runs and SkillRunner request ledger records.
- Keep ACP Chat archive behavior on the existing conversation archive path.
- Rename ACP Skills and SkillRunner user-visible drawer controls to `Runs`.
- Keep `Cancel Run` enabled only for non-terminal ACP Skills and SkillRunner runs.

## Capabilities

### Modified Capabilities

- `assistant-sidebar-ui`: shared drawer item actions, archive icon behavior, Runs wording, and Cancel Run availability.
- `acp-skills-interactive-execution`: ACP Skills terminal run archive marker and UI filtering.
- `skillrunner-sidebar-host-runtime`: SkillRunner ledger archive marker and UI filtering.

## Impact

- Affects Assistant panel model/renderer, ACP Skills run store/actions, SkillRunner ledger/run-dialog actions, and UI smoke tests.
- Does not change ACP Chat store semantics beyond consuming its existing archive action.
- Does not physically delete run records, logs, workspaces, results, or diagnostic artifacts.
- Does not change transcript, MCP, backend protocol, or workflow result contracts.
