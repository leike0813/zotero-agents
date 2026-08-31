## 1. Contract identity seam

- [x] 1.1 Add a failing public-seam test for interactive/non-interactive summaries and structured missing, unexpected, and version conformance; verify it fails because the contract owner does not exist.
- [x] 1.2 Implement the side-effect-free Workflow Host Contract Identity owner, migrate `hostApi.ts`, and verify the focused contract test passes without a complete member registry.

## 2. Version and diagnostic consumers

- [x] 2.1 Add a failing table-driven version-resolution test covering explicit, projection, internally-created, and unknown adapter cases; verify the current inconsistent defaults are observable.
- [x] 2.2 Migrate loader, runtime, input planning, and debug-probe diagnostics to the owner; verify focused loader, runtime-diagnostic, input-planning, and debug-probe tests pass with late binding preserved.

## 3. Compatibility and current documentation

- [x] 3.1 Add a governance test for the package compatibility range and explicit active-document version declarations; verify the package accepts versions 2 through current and the test fails on active v8 declarations.
- [x] 3.2 Record the agreed domain terms, update the SSOT and active broker spec to current-state wording, and verify the governance test plus strict OpenSpec validation pass.

## 4. Completion

- [x] 4.1 Run the focused test set, TypeScript `--noEmit`, targeted Prettier/ESLint, and OpenSpec validation; resolve every task-scoped failure and record final evidence.
