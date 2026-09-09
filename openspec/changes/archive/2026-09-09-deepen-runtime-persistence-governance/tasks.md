## 1. Lock the Governance Contract

- [x] 1.1 Extend the existing runtime persistence governance tests to exercise the consolidated scan and cleanup surface; verify `tests/core/108-runtime-persistence-governance.test.ts` passes.
- [x] 1.2 Add a trust-boundary regression for unknown cleanup categories; verify an invalid category cannot delete managed temporary data.

## 2. Consolidate Runtime Persistence Governance

- [x] 2.1 Move usage, integrity, category, issue, and retention policy into `runtimePersistenceGovernance.ts`; verify callers receive the existing DTO shapes.
- [x] 2.2 Keep path policy and late-bound filesystem operations in `runtimePersistence.ts`; verify Zotero and Node runtime-persistence tests pass.
- [x] 2.3 Remove store registration callbacks and expose only the concrete cleanup operations governance needs; verify TypeScript compilation succeeds.

## 3. Route Consumers and Remove Obsolete Seams

- [x] 3.1 Route preferences, lifecycle cleanup, Host Bridge diagnostics, and the cleanup CLI through Runtime Persistence Governance; verify their targeted tests pass.
- [x] 3.2 Remove the separate integrity module and unused runtime-usage hook event; verify repository imports and type checking contain no stale references.

## 4. Document and Validate

- [x] 4.1 Update the capability spec, component ownership documentation, and domain vocabulary; verify documentation names governance and filesystem ownership consistently.
- [x] 4.2 Run targeted tests, `tsc --noEmit`, ESLint, and Prettier checks; verify all checks pass apart from documented environment skips.
