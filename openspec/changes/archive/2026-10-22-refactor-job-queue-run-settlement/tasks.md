# Tasks

## 1. Neutral queue settlement

- [x] 1.1 Extend queue tests for raw result availability, metadata preservation and callback failure isolation; implement typed outcomes and post-storage settlement notification, and pass the targeted queue tests.
- [x] 1.2 Update all direct queue callers, including transport and Generic HTTP tests, and document the local queue/settlement boundary in job-queue.md; verify types and existing deadline/capacity behavior.

## 2. SkillRunner ownership

- [x] 2.1 Extend execution seam coverage for pre-ready, recoverable and terminal failures; move classification and canonical publication into the existing SkillRunner settlement owner, and verify the run projection and semantic events.
- [x] 2.2 Move SkillRunner progress/run initialization mapping into its run domain and compose it in runSeam; remove canonical writes inferred from generic job updates, preserving sequence, ACP and UI hooks, and pass execution seam/host queue/reducer tests.
- [x] 2.3 Update providers.md, workflow-execution-seams.md and the project ownership constraint; verify documentation matches current foreground/recovery behavior and the approved spec deltas.

## 3. Integration acceptance

- [x] 3.1 Run affected Node suites, TypeScript, SSOT invariants and changed-file lint/format checks; inspect the diff for unintended result, metadata, persistence or apply changes.
- [x] 3.2 Validate this change with OpenSpec strict validation and record checks and unexecuted real-host coverage in the change artifacts.

## Validation evidence

- Queue result-publication/callback-failure test failed before implementation and passed after neutral outcomes landed. Execution-seam failure scenarios failed before domain settlement composition and passed afterward.
- `node node_modules/tsx/dist/cli.mjs node_modules/mocha/bin/mocha tests/runtime/63-job-queue-progress.test.ts tests/runtime/38-generic-http-steps-provider.test.ts tests/workflows/48-workflow-execution-seams.test.ts tests/workflows/164-workflow-host-queue-management.test.ts tests/skillrunner/198-skillrunner-run-store-reducer.test.ts --require tests/setup/zotero-mock.ts --timeout 10000 --exit --reporter dot`: **119 passing**.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `npm run check:ssot-invariants`: passed.
- `node node_modules/eslint/bin/eslint.js` and `node node_modules/prettier/bin/prettier.cjs --check` with the three changed source files and four changed test files: passed.
- `git diff --check`: passed. Source diff reviewed for queue/domain dependency direction, original result identity, progress metadata, sequence ownership and terminal publication ordering.
- `openspec validate refactor-job-queue-run-settlement --strict`: passed. The obsolete provider requirements are explicitly removed and replaced, with migration descriptions preserving their applicable scenarios.
- Not executed: plugin build, real Zotero E2E and runtime/32 transport integration (requires full Zotero mode and reachable Mock SkillRunner). The transport test callback was updated and reviewed; it is not counted in the passing tests.

## Workflow follow-up

- Keep this change available for review and archive separately when requested. No Git commit or release is part of this implementation.
