## 1. Migration transaction and history

- [x] 1.1 Map canonical mutation terminal outcomes in the migration service, stop after a failed set, preserve earlier receipts, and verify the migration service regression tests pass.
- [x] 1.2 Persist parent titles through the existing receipt table and bounded Dashboard DTO, including an additive upgrade for existing databases, and verify plugin-state and Zotero transaction tests pass.

## 2. Migration interaction design

- [x] 2.1 Publish immediate and progress refreshes for scan/apply, derive busy state from the active snapshot, lock transaction controls while retaining Stop, and verify migration region tests pass.
- [x] 2.2 Replace the flat operation log with bounded run/set history details and terminal outcomes, and verify the migration component and browser tests cover failed and completed runs.
- [x] 2.3 Make the toolbar fill the available width and move search/filters to a second responsive row at the narrow breakpoint, and verify the Dashboard browser layout assertions pass.

## 3. Topic relation review

- [x] 3.1 Confirm the canonical edge in the same Rust transaction as review approval, reuse post-commit hierarchy discovery refresh, and verify `cargo test --workspace --locked --no-fail-fast` passes.
- [x] 3.2 Exclude terminal relations from Topics and the Review Center Open filter while retaining Accepted/All history and collapsing legacy stale tuples, and verify the Topics and Review Center projection tests pass.

## 4. Documentation and integration checks

- [x] 4.1 Update the migration and Workbench component documentation and verify it agrees with the three delta specs.
- [x] 4.2 Run focused Node and Zotero suites, TypeScript checks, ESLint, Prettier, Rust Clippy/format checks, Synthesis surface parity, and `git diff --check`; verify every gate passes.
