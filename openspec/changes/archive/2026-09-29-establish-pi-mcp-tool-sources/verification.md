# C10 verification — 2026-09-29

## Scope and result

The outbound MCP source registry, Backend Manager controls, v2 HTTP client, C09 stdio transport, and C07 Gateway projection are implemented. Linux and Windows host acceptance passed, and the full Node suite now passes on all 28 shards (maintainer-reported after the workspace test-governance and platform fixes below; the run output was not archived). All three deltas were synced into `openspec/specs` on 2026-09-29 and the change was archived to `openspec/changes/archive/2026-09-29-establish-pi-mcp-tool-sources/`.

| Dimension | Status |
| --- | --- |
| Completeness | 11/11 tasks checked; delta specs synced to `openspec/specs`; change archived |
| Correctness | 6/6 delta requirements have implementation paths; 10/10 scenarios have code paths, with focused tests for the main trust and lifecycle boundaries |
| Coherence | Follows the single profile registry, C03 credential store, C09 process bridge, C07 Gateway, and lazy plugin ownership decisions |

Official OpenSpec verification on 2026-09-29 found all 6 added requirements and 10 scenarios mapped to implementation and focused tests, with no new design or code-pattern divergence. Task completion is 11/11 after the maintainer checked the integrated acceptance and finalization tasks. No spec, scenario, or design check was skipped.

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

## Acceptance history and remaining work

1. **Resolved — acceptance decision:** Windows `npm run test:node` once completed with 14 of 28 shards passing and 14 failing, spanning ACP, Host Bridge, SkillRunner, Synthesis, tooling, workflow packages, and Zotero Host; `runtime-provider-execution` separately failed five existing C08 Trusted Native cases (two Windows symlink fixture permission errors, three Bash-specific mock Shell expectations), and earlier Linux verification found Host Bridge runtime failures (`repair_required` rather than `committed`, plus a registry import timeout). Those failures were traced to test-side Windows assumptions rather than to the C10 source runtime, and the workspace now carries the fixes: `.cmd` bridge launchers, junction instead of symlink for directory links, platform-selected shell names, a seeded runtime environment snapshot, ACP e2e fixture path escaping and stderr diagnostics, tightened Host Bridge and Zotero Host assertions, plus `acpTransport` Windows argument passing and `run-zotero-test-with-mock` POSIX path handling. The maintainer then reported the full `npm run test:node` run passing on all 28 shards; that output was not archived, so no shard-level counts are recorded here.
2. **Resolved — finalization:** all three deltas were merged into `openspec/specs` on 2026-09-29 — `pi-mcp-tool-sources` created from its ADDED requirements (4 requirements, 7 scenarios), and `pi-tool-gateway-policy` (1 requirement) and `backend-manager-ui` (1 requirement) extended. `openspec validate <capability> --type spec --strict` passes for all three, and the change directory was moved to `openspec/changes/archive/2026-09-29-establish-pi-mcp-tool-sources/`.
3. Full Node runs require the three built-in Skill submodules (`literature-analysis`, `literature-explainer`, `literature-translator`) to be initialized first; see `docs/testing-framework.md`.

No production Conversation or Skill Run owner calls this source runtime yet. C16/C17 own that connection; this C10 module presents the frozen Gateway definitions for those owners.
