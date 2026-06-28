## 1. Specs

- [x] Add delta requirements for shared official content package install progress.
- [x] Add delta requirements for workflow menu install progress toast.
- [x] Validate the change with OpenSpec.

## 2. Runtime

- [x] Add coarse progress DTO/store and installer callback.
- [x] Emit stage updates from the content package installer.
- [x] Wrap hook-driven installs so registry/menu refresh contributes to progress.

## 3. UI

- [x] Show startup and workflow menu installation progress toasts immediately after install starts.
- [x] Add Preferences official package progress row backed by the shared snapshot.
- [x] Localize all new user-visible labels.

## 4. Validation

- [x] Add focused tests for installer progress emission.
- [x] Add focused tests for startup/menu progress feedback and Preferences progress rendering.
- [x] Run TypeScript, localization governance, OpenSpec validation, and related test slices.
