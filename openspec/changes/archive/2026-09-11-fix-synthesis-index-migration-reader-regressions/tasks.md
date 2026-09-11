## 1. Synthesis Index resilience

- [x] 1.1 Add Broker and Host Read regressions for an oversized child note and verify they fail before implementation.
- [x] 1.2 Normalize the Broker error and isolate it in artifact scan diagnostics; verify the focused Broker and Host Read tests pass.

## 2. Literature migration semantics

- [x] 2.1 Replace the mixed-payload blocking regression with preservation and unknown-payload cases; verify the converter tests fail before implementation.
- [x] 2.2 Centralize known/migratable payload types, bump definition version to 3, and preserve non-target payloads; verify migration service tests pass.
- [x] 2.3 Add paged runtime selection tests and implement ready/review/blocked selection plus bounded receipt-backed pages; verify service tests pass.

## 3. Dashboard migration experience

- [x] 3.1 Add UI regressions for bounded pages, candidate checkboxes, review opt-in, blocked candidates, and apply payload ownership; verify they fail before implementation.
- [x] 3.2 Implement the bounded candidate-page wire/actions/projection and accessible scrollable Dashboard region; verify Dashboard/UI tests pass.
- [x] 3.3 Add localized migration controls and reason labels for every shipped locale; verify localization governance passes.

## 4. Topic Report first render

- [x] 4.1 Add a Reader regression that rerenders an unchanged first-open report with unrelated state and verifies body/outline/frame/scroll identity; verify it fails before implementation.
- [x] 4.2 Move Report Markdown rendering into stable declarative slots and correct the shell height grid; verify Reader tests pass.

## 5. Documentation and validation

- [x] 5.1 Update migration and Workbench component documentation to describe the final boundaries and verify OpenSpec strict validation passes.
- [x] 5.2 Run focused and affected-domain tests, lint, and build. Fresh-session Zotero UI acceptance was unavailable because this execution may not start the development server and no authorized desktop-control session was available; the first-open Reader DOM regression covers the reported failure automatically.
