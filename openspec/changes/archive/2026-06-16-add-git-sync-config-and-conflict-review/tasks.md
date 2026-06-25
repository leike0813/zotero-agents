# Tasks

## OpenSpec

- [x] Create proposal/design/tasks.
- [x] Add delta specs for Git Sync, Workbench UI, and docs.

## Preferences and Config

- [x] Add Git Sync preferences card.
- [x] Add preference script bindings for save token, clear token, save config, and test connection.
- [x] Add config facade for prefs status, save, clear token, encrypted token save, and connection test.

## Workbench and Conflict Review

- [x] Extend Git Sync state/UI DTO with config status and token metadata.
- [x] Upgrade conflict action API to semantic actions.
- [x] Update Workbench Sync panel for config state and conflict approval actions.

## Docs

- [x] Update Git Sync durable-state and Workbench UI docs.

## Tests and Validation

- [x] Add focused prefs/config tests.
- [x] Add focused conflict action/UI projection tests.
- [x] Run focused Git Sync and UI tests.
- [x] Run `openspec validate add-git-sync-config-and-conflict-review --type change --strict`.
- [x] Run `npx tsc --noEmit`.

## Follow-up: Empty Remote Initialization

- [x] Treat successful empty `ls-remote --heads` output as `missing_initializable`, not a connection failure.
- [x] Treat `fetch origin <branch>` missing-remote-ref results as first-sync initialization and skip merge.
- [x] Keep auth/network/permission fetch failures outside the initialization path.
- [x] Show initializable branch state in Preferences and Workbench status.
- [x] Add focused connection, sync behavior, UI model, and documentation/spec coverage.
