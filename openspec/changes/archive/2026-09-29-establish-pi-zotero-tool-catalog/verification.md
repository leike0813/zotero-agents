# C12 verification — 2026-09-29

| Dimension | Status |
| --- | --- |
| Completeness | 7/7 tasks; both full-suite gates passed; two delta specs synced and change archived |
| Correctness | 4/4 delta requirements and 8/8 scenarios map to implementation and focused tests |
| Coherence | Broker-bound catalog uses C07 Gateway admission and receipts; no separate lifecycle owner |

## Passing evidence

- `node --import tsx node_modules/mocha/bin/mocha tests/runtime/245-pi-tool-gateway.test.ts tests/runtime/250-pi-zotero-tool-catalog.test.ts --require tests/setup/zotero-mock.ts --exit` — 23 passed in the current environment.
- `npm run test:node -- --shard runtime-provider-execution` — 10 files passed before the environment changed.
- `npm run test:node` — all 28 shards passed in one post-fix run, including `runtime-provider-execution`, `runtime-platform-persistence`, `synthesis-application`, and `zotero-host`.
- `ZOTERO_TEST_GREP='Pi Zotero Native Tool Catalog' npm run test:zotero:core` — 5 passed in real Linux Zotero before the environment changed, including the Broker → catalog → Gateway current-view canary and no-Node check.
- `xvfb-run -a env ZOTERO_TEST_HEADLESS=0 npm run test:zotero:core` — complete real Linux core suite, 80 passed. After the display-mode fix, the standard `npm run test:zotero:core` also passed all 80 cases with no override. Both runs include all four library-page cases and the C12 canary.
- `node --import tsx node_modules/mocha/bin/mocha tests/zotero-host/91-zotero-test-infrastructure.test.ts --require tests/setup/zotero-mock.ts --grep 'Zotero display environment|selected headless backend' --exit` — 5 passed. The new Linux case failed before the fix (`MOZ_HEADLESS` was still `1`) and passed afterward.
- `npx tsc --noEmit`, `npm run lint:check`, `npm run build`, and `openspec validate establish-pi-zotero-tool-catalog --strict` passed.

## Acceptance history

The Linux core blocker is resolved. The default launcher set `MOZ_HEADLESS=1` while also asking `zotero-plugin-scaffold` to provide Xvfb on a display-less Linux host. With that combination, isolated library-page runs stopped at varying Zotero fixture write/cleanup calls, and even Mocha's timeout did not fire. Using Xvfb without native headless passed the isolated case and the complete 80-case suite. `applyZoteroTestHeadlessEnvironment` now removes `MOZ_HEADLESS` when Xvfb is selected; the unmodified standard core command then passed the same complete suite. Temporary test instrumentation was removed.

An earlier full Node run passed 27/28 shards and exposed a 10-second Host Bridge import timeout; the isolated import took about 10.9 seconds, so that test's timeout was raised to 30 seconds. The first unrestricted full run completed with 26/28 shards passing. Its only failures were Mocha's default 2-second timeout in the runtime adapter governance scan and topic synthesis package renderer; each isolated case passed in about 1.7 and 1.4 seconds. Those two cases now have explicit 10-second limits. Both affected shards passed independently, then the complete post-fix suite passed 28/28 shards.

Official OpenSpec verification maps all four requirements and eight scenarios to the production Gateway/catalog paths and focused tests. It found no additional implementation or design divergence. The delta specs were synced to `openspec/specs/pi-zotero-tool-catalog/spec.md` and `openspec/specs/pi-tool-gateway-policy/spec.md`; both main specs passed strict validation. The fully checked change was archived on 2026-09-29 with `--skip-specs` because its ADDED requirements were already present in the main specs.
