## 1. Regression Tests

- [x] 1.1 Add a production-surface test proving the ACP Skills Workspace adapter implicitly selects the most recent run when the explicit selection is empty, preserves a live explicit selection, and keeps the explicit empty-selection getter contract.
- [x] 1.2 Add renderer tests proving a stick-to-bottom first render requests no history page and renders the tail window, and that an incremental anchor restore synchronizes the `last-scroll-top` marker.
- [x] 1.3 Add a test proving a boundary-mode cold indexed store read hides streaming items and projects the visible count, while a live-mode read of the same transcript returns them.

## 2. Selection Restore

- [x] 2.1 Extract the synchronous core of `selectAcpSkillRun` and add `ensureAcpSkillRunWorkspaceSelection` to the ACP Skills run store.
- [x] 2.2 Resolve ACP Skills owner navigation and the workspace adapter `selectedOwner` through the implicit-selection operation.

## 3. Transcript Renderer

- [x] 3.1 Compute the virtual render window and loading-gap viewport from tail intent on stick-to-bottom renders in both the full and incremental paths.
- [x] 3.2 Synchronize the `last-scroll-top` marker after incremental anchor restores, matching the full render path.
- [x] 3.3 Remove the dead `data-assistant-transcript-scroll-render` attribute writes.

## 4. Cold Read Projection

- [x] 4.1 Route boundary-mode cold indexed transcript store reads through the shared UI-visibility projection while keeping the live-mode indexed page read.

## 5. Verification

- [x] 5.1 Run the targeted Mocha suites (`107`, `97`, `184`, `190`, `171`, `181`), confirming all tests pass.
- [x] 5.2 Run TypeScript checking plus Prettier and ESLint on every changed file, confirming a clean result.
