## 1. Specs

- [ ] Add delta requirements for shared official content package install progress.
- [ ] Add delta requirements for workflow menu install progress toast.
- [ ] Validate the change with OpenSpec.

## 2. Runtime

- [ ] Add coarse progress DTO/store and installer callback.
- [ ] Emit stage updates from the content package installer.
- [ ] Wrap hook-driven installs so registry/menu refresh contributes to progress.

## 3. UI

- [ ] Show startup and workflow menu installation progress toasts immediately after install starts.
- [ ] Add Preferences official package progress row backed by the shared snapshot.
- [ ] Localize all new user-visible labels.

## 4. Validation

- [ ] Add focused tests for installer progress emission.
- [ ] Add focused tests for startup/menu progress feedback and Preferences progress rendering.
- [ ] Run TypeScript, localization governance, OpenSpec validation, and related test slices.
