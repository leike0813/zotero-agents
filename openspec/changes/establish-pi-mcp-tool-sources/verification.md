# C10 verification — 2026-09-29

## Scope and result

The outbound MCP source registry, Backend Manager controls, v2 HTTP client, C09 stdio transport, and C07 Gateway projection are implemented. This change remains active. Linux acceptance passed. The user chose to keep C10 unarchived until real Windows Zotero stdio evidence and the full-suite failures are handled; no acceptance exception was granted.

| Dimension | Status |
| --- | --- |
| Completeness | 8/11 implementation tasks checked; 3 acceptance/finalization tasks remain |
| Correctness | 6/6 delta requirements have implementation paths; 10/10 scenarios have code paths, with focused tests for the main trust and lifecycle boundaries |
| Coherence | Follows the single profile registry, C03 credential store, C09 process bridge, C07 Gateway, and lazy plugin ownership decisions |

## Passing evidence

- `npm run test:node -- --shard runtime-provider-registry` — 6 files passed, including legacy/model and MCP credential namespace isolation and distinct encrypted revisions on replacement/recreation.
- `npm run test:node -- --shard runtime-provider-execution` — 9 files passed, including source admission, import/export, descriptor review, no replay, OAuth result classification, stdio JSON-RPC, and Gateway receipts.
- `npm run test:node -- --shard dashboard` — 13 files passed, including request-bound MCP discovery and stale result rejection.
- `npm run test:node -- --shard ui` — 16 files passed.
- `npx tsx node_modules/mocha/bin/mocha tests/host-bridge/101-zotero-mcp-server.test.ts --require tests/setup/zotero-mock.ts --grep 'reviewed outbound Pi MCP source' --exit` — 1 real HTTP protocol integration test passed.
- `ZOTERO_TEST_GREP='Pi MCP source transport' npm run test:zotero:core` — 1 Linux real-Zotero stdio test passed.
- `ZOTERO_TEST_GREP='Built-in Agent Backend Manager page' npm run test:zotero:ui` — 1 Linux real-Zotero UI test passed. Its first attempt exposed a test timing race; the corrected test passed.
- `npx tsc --noEmit`, `npx tsc -p tsconfig.dashboard.json --noEmit`, `npm run lint:check`, `npm run build`, `npm run check:pi-mcp-browser-bundle`, and `npx openspec validate establish-pi-mcp-tool-sources --strict` passed on the final implementation.

The browser check built the focused MCP entry at 1,185,939 bytes and found no Node MCP SDK; the full plugin browser entry did not include the legacy MCP SDK. The v1 SDK remains only as a transitive dependency of `@google/genai` through Pi AI and is absent from the plugin bundle.

## Open issues before archive

1. **CRITICAL — Windows host evidence:** Task 3.1 requires the same C09-backed stdio canary in real Windows Zotero. This Linux workspace cannot supply that result. Run `ZOTERO_TEST_GREP='Pi MCP source transport' npm run test:zotero:core` on the Windows host with the current source tree and record the receipt for `tests/zotero/core/lite/283-pi-mcp-tool-sources.zotero.test.ts`.
2. **CRITICAL — acceptance decision:** `npm run test:node` ran and did not pass across other shards; one representative failure was `embedded payload attachment is unavailable`. `npm run test:node -- --shard host-bridge-runtime` failed in `tests/host-bridge/107-host-bridge-capabilities.test.ts:639` and `:2483`: a production diagnostic registry import exceeded its 10 s timeout, and an uploaded attachment mutation returned `repair_required` instead of `committed`. The two cases also failed when isolated together. A standalone build/import probe of the registry took about 0.9 s/2.4 s, so the timeout's cause is not established. The focused outbound MCP HTTP test and all C10 Node shards passed. Investigate these failures or record a candidate-specific exception before task 4.1 is complete.
3. **CRITICAL — finalization:** Task 4.2 remains open. After host acceptance and the acceptance decision, repeat official verification, sync the delta specs, and archive the change.

No production Conversation or Skill Run owner calls this source runtime yet. C16/C17 own that connection; this C10 module presents the frozen Gateway definitions for those owners.
