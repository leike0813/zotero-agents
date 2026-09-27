## 1. SkillRunner Task Projection Ownership

- [x] 1.1 Remove SkillRunner projection hydration, synchronization, merge, and persistence helpers from Task Runtime; verify Run Store projections remain visible through `tests/core/159-separated-run-stores.test.ts` and `tests/core/42-task-runtime.test.ts`.
- [x] 1.2 Make full and summary task reads combine current Run Store projections without populating the generic task-record cache; verify SkillRunner-only reads do not scan generic candidates in `tests/core/159-separated-run-stores.test.ts`.
- [x] 1.3 Preserve Dashboard's bounded revision/dirty projection cache and document that it is not lifecycle truth; verify refresh governance with `tests/core/163-background-refresh-governance.test.ts`.

## 2. Window and Logging Owners

- [x] 2.1 Extract the Preferences local-runtime binding with captured-window ownership, identity-safe replacement, idempotent cleanup, and disposed async guards; verify command, unload, and stale-effect cases with `tests/ui/40-gui-preferences-menu-scan.test.ts`.
- [x] 2.2 Move Workflow caller validation, trusted identity binding, and sanitization into a narrow Workflow logging owner while retaining normalized storage in the runtime log manager; verify bounds and platform-neutral loading with `tests/core/45-runtime-log-manager.test.ts` and `tests/core/47-workflow-host-api-v12.test.ts`.

## 3. Literature Artifact Migration Ownership

- [x] 3.1 Consolidate legacy decoding, normalization, matching, classification, diagnostics, counts, and basis generation behind one pure converter entry; verify library migration and offline import use the same result with `tests/core/264-literature-artifact-migration.test.ts` and workflow literature tests 45/47.
- [x] 3.2 Remove duplicate classification and unused migration adapter seams while retaining lifecycle and Broker-owned apply behavior; verify migration core and workflow literature suites pass.
- [x] 3.3 Project the registered migration ID and exact definition version into Dashboard, and keep unavailable fallback non-actionable without displaying a placeholder version; verify with `tests/ui/264-literature-migration-region.test.ts`.

## 4. Documentation and Integrated Verification

- [x] 4.1 Update component and developer documentation for the new owners, Run Store projection path, and migration definition; verify generated help documentation with `npm run check:help-docs`.
- [x] 4.2 Verify TypeScript configurations, formatting, lint, SSOT invariants, and production build with `npx tsc --noEmit --pretty false`, Dashboard/Sidebar type checks, `npm run lint:check`, `npm run check:ssot-invariants`, and `npm run build`.
- [x] 4.3 Run the targeted regression sets and confirm 111 core tests, 43 UI tests with 2 pending, and 59 workflow literature tests pass.
