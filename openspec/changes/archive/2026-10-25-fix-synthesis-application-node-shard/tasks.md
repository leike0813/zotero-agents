# Tasks

## 1. HB-08 mock isolation

- [x] 1.1 Add failing toolkit/prototype reset behavior cases to the existing mock isolation suite, then restore shared prototype descriptors and pass that suite.
- [x] 1.2 Document the reset isolation contract in zotero-mock-parity.md and record HB-08 red/green evidence here.

## 2. Existing application shard failures

- [x] 2.1 Scope a cancelable zero-delay scheduler to the large Index case, preserve its dataset/assertions, pass it alone, and document its test scheduling boundary.
- [x] 2.2 Repair grouped manifest fixtures in the MCP and Host Bridge suites and pass both affected existing cases.
- [x] 2.3 Add allowed/forbidden root-opener behavior cases, distinguish repository and canonical recovery paths in the boundary checker, and pass its suite and CLI.

## 3. Integration acceptance

- [x] 3.1 Run synthesis-application through the normal shard runner and require a successful exit with no failures.
- [x] 3.2 Run the full Node suite once, record all shard outcomes and any unrelated failures, and verify it proceeds beyond synthesis-application.
- [x] 3.3 Run applicable type, formatting, lint, and OpenSpec checks; review the final diff and record results.

## Evidence

- HB-08: the real toolkit hook case failed before the fix (a reset item retained `Hooked title`), then passed. The full mock isolation file passes all 14 cases, covering field behavior, deleted methods, accessors, and added string/symbol members on all four shared prototypes.
- The unchanged large Index scenario failed alone before the fix (`matching directory did not settle`); its scoped scheduler passes in about 1.3 seconds with the 56,000-source dataset and two-scan assertion intact.
- Both manifest cases failed before fixture correction and pass afterward through their actual MCP/HTTP routes.
- The production root-opener table failed before implementation; all 6 boundary cases and `npm run check:synthesis-service-boundary` pass afterward.
- `npm run test:node -- --shard synthesis-application`: exit 0, 10 files, 25,676 ms; the normal runner reports all shards passed.
- The full `npm run test:node` run also completed synthesis-application successfully (26,740 ms) and advanced to synthesis-workbench and tooling.
- `node node_modules/typescript/bin/tsc --noEmit`, ESLint on all seven modified TypeScript files, Prettier on all changed files/artifacts, `git diff --check`, and `openspec validate fix-synthesis-application-node-shard --strict` pass.

## Full Node run

`npm run test:node` completed all 28 shards naturally: 19 passed, 9 failed, exit 1.
The summed shard duration was 1,147,787 ms. No shard was force-terminated.
The full local log is `%TEMP%/fix-synthesis-application-node-shard-f223781104a245c7a8acca03e769fb98.log`.

Passing shards: acp-session, acp-skill-run, assistant, dashboard,
runtime-provider-registry, runtime-provider-execution, runtime-provider-products,
runtime-task-queue, skillrunner-surface-release, synthesis-engine,
synthesis-application, tooling-deep-reading, tooling-content-release, ui, shared,
workflow-engine, workflow-packages-literature, workflow-packages-workbench,
workflow-packages-tags.

Remaining failures are outside the agreed application-shard repair. The failure
report contains no failures in the new mock isolation cases or the repaired
manifest, Index directory, and production-opener cases.

| Shard                        | Failing cases | Remaining failure observations                                                                                                                 |
| ---------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| acp-runtime                  | 9             | Five child-process error expectations, semantic trace size, and three missing peer evidence files.                                              |
| host-bridge-runtime          | 1             | The unchanged resolver-input error case receives HTTP 503 instead of 400; the repaired manifest pagination case passes.                          |
| host-bridge-surface-release  | 9             | Six Python resident-service failures, two missing win32-x64 packaged binaries, and `spawnSync npm ENOENT`.                                       |
| runtime-platform-persistence | 1             | Windows rejects symlink creation with `EPERM`.                                                                                                  |
| skillrunner-runtime          | 1             | Existing source-text assertion expects `submit.local_created` in the sidebar host runtime.                                                      |
| synthesis-workbench          | 1             | Cached Index scaffold test expects a loading marker.                                                                                            |
| tooling-runtime              | 1             | Existing source-text assertion expects the old sidecar health timer shape.                                                                      |
| workflow-host                | 1             | Builtin v12 governance scanner reports two findings.                                                                                            |
| zotero-host                  | 4             | Two owned-process termination expectations, a system E2E admission-hold expectation, and a Windows/POSIX scaffold-path expectation.              |

The full suite remains non-green; no production/schema changes were made to
silence these separate failures. Plugin build and real Zotero acceptance were
not run because this change is confined to Node test infrastructure and checks.
