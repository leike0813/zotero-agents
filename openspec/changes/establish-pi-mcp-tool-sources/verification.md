# C10 verification — 2026-09-29

## Scope and result

The outbound MCP source registry, Backend Manager controls, v2 HTTP client, C09 stdio transport, and C07 Gateway projection are implemented. Linux and Windows host acceptance passed. This change remains active because the full Node suite still fails outside the focused C10 tests; no acceptance exception has been granted.

| Dimension | Status |
| --- | --- |
| Completeness | 9/11 tasks checked; integrated acceptance and finalization remain |
| Correctness | 6/6 delta requirements have implementation paths; 10/10 scenarios have code paths, with focused tests for the main trust and lifecycle boundaries |
| Coherence | Follows the single profile registry, C03 credential store, C09 process bridge, C07 Gateway, and lazy plugin ownership decisions |

Official OpenSpec verification on 2026-09-29 found all 6 added requirements and 10 scenarios mapped to implementation and focused tests, with no new design or code-pattern divergence. Task completion is 9/11, so the two unchecked acceptance/finalization tasks are CRITICAL for archive readiness. No spec, scenario, or design check was skipped.

## Passing evidence

- `npm run test:node -- --shard runtime-provider-registry` — 6 files passed, including legacy/model and MCP credential namespace isolation and distinct encrypted revisions on replacement/recreation.
- `npm run test:node -- --shard runtime-provider-execution` — 9 files passed, including source admission, import/export, descriptor review, no replay, OAuth result classification, stdio JSON-RPC, and Gateway receipts.
- `npm run test:node -- --shard dashboard` — 13 files passed, including request-bound MCP discovery and stale result rejection.
- `npm run test:node -- --shard ui` — 16 files passed.
- `npx tsx node_modules/mocha/bin/mocha tests/host-bridge/101-zotero-mcp-server.test.ts --require tests/setup/zotero-mock.ts --grep 'reviewed outbound Pi MCP source' --exit` — 1 real HTTP protocol integration test passed.
- `ZOTERO_TEST_GREP='Pi MCP source transport' npm run test:zotero:core` — 1 Linux real-Zotero stdio test passed.
- `ZOTERO_TEST_GREP='Built-in Agent Backend Manager page' npm run test:zotero:ui` — 1 Linux real-Zotero UI test passed. Its first attempt exposed a test timing race; the corrected test passed.
- Windows Zotero 10.0.2: `ZOTERO_TEST_GREP='Pi MCP source transport' npm run test:zotero:core` passed 3/3, including the real stdio JSON-RPC exchange and observed bridge shutdown. The canary originally exposed a PowerShell `$input` fixture error, an SDK import on addon shutdown before browser streams existed, and a lingering test bridge; all three were corrected and the canary exited normally.
- Windows Zotero 10.0.2: `npm run test:zotero:core` finished with 73 passed and 1 pending, then exited normally; `npm run test:zotero:ui` passed 3/3 and exited normally. One earlier full-core run had a transient managed-note assertion failure; the isolated case passed, then the complete suite passed on rerun.
- Windows: `npx tsx node_modules/mocha/bin/mocha tests/runtime/249-pi-mcp-tool-sources.test.ts --require tests/setup/zotero-mock.ts --exit` passed 10/10; `npm run test:node:ui` passed its UI and shared suites.
- Windows: the reviewed outbound Pi MCP source HTTP integration case in `tests/host-bridge/101-zotero-mcp-server.test.ts` passed 1/1.
- Windows: `npx tsc --noEmit`, `npm run lint:check`, `npm run build`, `npm run check:pi-mcp-browser-bundle`, and `openspec validate establish-pi-mcp-tool-sources --strict` passed after the source changes.

The Windows browser check built the focused MCP entry at 1,280,452 bytes and found no Node MCP SDK; the full plugin browser entry did not include the legacy MCP SDK. The v1 SDK remains only as a transitive dependency of `@google/genai` through Pi AI and is absent from the plugin bundle.

## Open issues before archive

1. **CRITICAL — acceptance decision:** Windows `npm run test:node` completed with 14 of 28 shards passing and 14 failing. The failing shards span ACP, Host Bridge, SkillRunner, Synthesis, tooling, workflow packages, and Zotero Host. The C10-specific test passed 10/10, and the UI/shared suites passed. `npm run test:node -- --shard runtime-provider-execution` separately failed five existing C08 Trusted Native cases: two Windows symlink fixture permission errors and three Bash-specific mock Shell expectations. Earlier Linux verification also found Host Bridge runtime failures (`repair_required` rather than `committed` and a registry import timeout). These failures have not been accepted as a C10 exception. Investigate the unrelated suites or obtain a candidate-specific acceptance decision before checking task 4.1.
2. **CRITICAL — finalization:** Task 4.2 remains open. After the acceptance decision, repeat official verification, sync the delta specs, and archive the change.

No production Conversation or Skill Run owner calls this source runtime yet. C16/C17 own that connection; this C10 module presents the frozen Gateway definitions for those owners.
