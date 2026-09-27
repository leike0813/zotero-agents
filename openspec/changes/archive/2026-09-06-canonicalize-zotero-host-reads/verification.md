# Implementation verification

Baseline: `4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`. Work remains uncommitted. This report records executed checks and distinguishes integration checkpoints from final regression results.

## Executed checks

| Command / seam | Result |
| --- | --- |
| `openspec validate canonicalize-zotero-host-reads --strict` | PASS |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS after integration corrections |
| `npm run build` | PASS: help content, Synthesis package checks, plugin build, main and sidebar TypeScript |
| `cargo test --locked --manifest-path cli/zotero-bridge/Cargo.toml` | PASS: 122 unit + 11 schema-mode tests |
| `cargo fmt --manifest-path cli/zotero-bridge/Cargo.toml -- --check` | PASS |
| Mocha 106 server + 108 MCP mirror + 186 output boundaries | PASS: 46 tests |
| Mocha 139 CLI packaging | PASS: 59 tests; 3 runtime/platform-dependent cases pending |
| Mocha 169 agent surface + 170 surface manifest | PASS: 21 tests |
| Mocha 171 package validator + 172 mirror | PASS: 7 + 5 tests |
| `npm run render:host-bridge-content` | PASS |
| `npm run check:host-bridge-content` | PASS, no render drift |
| Materialized package checker with fixed `--baseline-ref` across all eight owned packages | PASS, 28 advisory depth warnings reviewed below |
| `npm run check:host-bridge-review-mirror` | PASS, 152 files |
| ESLint changed scripts and 139/169/170 tests | PASS |
| `git diff --check` | PASS |
| Mocha 101 MCP + 105 concurrency + 107 Bridge + 138 locality | PASS: 125 tests; one real ACP runtime case pending |
| Mocha 108 MCP mirror + 186 output boundaries | PASS: 12 tests |
| Mocha 102 Broker + 102 payload codec + Node 185 source queries + 107 Bridge + 178 Synthesis + UI 48 artifacts | PASS: 162 tests in the final joint run |
| Mocha UI 35 workflow settings execution + 50 settings model | PASS: 46 tests |
| ESLint all changed TypeScript/JavaScript paths | PASS: no errors; 17 workflow package paths excluded by repository config |

CLI regression was run red before removing payload offset/max-chars and note max-excerpt argv. Source rendering regression failed on Windows path-map separators before the shared path-key fix, then passed. Existing mirror tests failed on Windows containment before switching to native `path.relative`, then all passed. The command-card validator now uses the descriptor/card coverage checks already present instead of a duplicated fixed command count.

## Native compatibility execution

The official Windows x64 runner passed on Zotero 7.0.32, 9.0.6 and 10.0.1: **43 tests per target**, including native child/collection/Saved Search pages and existing SQLite keyset and socket cases. Command: `npm run test:zotero:compatibility:run -- --target <target> --mode behavior --suite lite --domain core --runs-root D:/zc39 --timeout-ms 180000` (the first Zotero 7 run used 120000).

Initial attempts exposed two fixture execution problems: direct `spawn(npm.cmd)` returned `EINVAL`, fixed by launching the Windows npm script through `cmd.exe`; the long default temporary directory exceeded native file path limits, resolved with the runner's existing `--runs-root` option. Both selection fixture writes and socket upload then passed without production changes. Linux/macOS matrix cells and full native suites were not run.

Receipts:

- `D:/zc39/zotero-7-windows-x64-behavior-lite-fb3aa723-8c85-4325-b3d1-8c0e5f7b4779/receipt.json`
- `D:/zc39/zotero-9-windows-x64-behavior-lite-47c50d50-6edb-4cf8-9d3c-f37355f9b415/receipt.json`
- `D:/zc39/zotero-10-windows-x64-behavior-lite-e112ae0c-5c1d-4c01-86cd-9825862bf3d8/receipt.json`
- `D:/zc39/zotero-10-windows-x64-behavior-lite-9cd89c54-eac8-492b-8b5d-cdead1119c17/receipt.json` — repeated integration checkpoint, 43 passed, plugin SHA-256 `73ca98f150bf5c1747f24cf5568a4ec703a603ea1e9def6fa06713f998a23177`.
- `D:/zc39/zotero-10-windows-x64-behavior-lite-ae0c1f0c-22a2-4854-99c4-b14644f97287/receipt.json` — final implementation, 43 passed, plugin SHA-256 `2fa7e36e4c78b178b4574a5a8147f03aba657af472ec89a408d899b70f61f305`.

## Governed surface review

Semantic review ran with the fixed baseline through `host-bridge-semantic-review-context.ts`; `reviewRequired: true`. The only semantic instruction source changed is `skills_src/zotero-bridge-cli/SKILL.md`. CLI argv and executable JSON contracts generate the affected command cards. Generic query policy already requires complete page evidence, including empty pages; Hermes snapshot promotion remains tied to terminal completion evidence. Neither requires a second copy of the new low-level rules.

| Authorized replacement / preserved unit | Current owner and evidence |
| --- | --- |
| DEL-01/02 ordinary read arrays and old result projections | Canonical Broker pages, executable output schemas, explicit Workflow projection and consumer inventory |
| DEL-05 ordinary offset/array pagination and obsolete TTL wording | Source cursors; minimum-core continuation section and generated library command cards |
| DEL-16 whole-tool queue, positions and queue wait | MCP nine-inflight admission; architecture docs and tests 101/105 |
| Identity-list duplicate rejection | Preserved in place; payload candidates explicitly retain duplicates for ambiguity checks |
| Command discovery, input binding, authorization, downloads and recovery | Preserved in the same minimum-core sections and complete generated cards |
| Snapshot TTL, batch limits and promotion evidence | Preserved without ordinary-list semantics replacing them |
| Generic research policy and Hermes resident policy | Sources unchanged; inherited minimum-core composition remains manifest-owned |
| Notification, watched runs, attention, catalog/index, maintenance, receipts, cron and Generic Input Planning v2 | No semantic source edit or deletion |

Unmapped: **0**. Downgraded: **0**. Unauthorized dropped: **0**. Intra-package duplicate: **0**. Explicit deletion authorization is limited to the ordinary array/offset/TTL and MCP whole-tool queue units above; no instruction file is deleted. All other baseline prose remains in place. The new Saved Search command has a complete generated card.

The 28 advisory depth warnings all concern existing minimum-core command cards outside the new read semantics: bridge backend list/status, bridge profile diagnose/inspect, bridge status, context item/note open, debug reapply/persistence/status/clean-install-reset, mutation preview, run permission get and skill connect/get, surface describe/identity, Synthesis cache invalidate/status, graph refresh-metrics, index status, workflow agent-result validate/defaults/list/profile describe/list/refresh/queue cancel. Accepted because each retains its independently complete argv, schemas, effects, approval, handles, targets and recovery contract; all exceed the hard floor and none loses substantive baseline instructions. The relative line/prose gate passed across all owned packages.

The official mirror prepare/finalize/check workflow produced 152 owned files: minimum-core 133/133 owned/effective, Generic 13/146, Hermes 6/152. Unchanged translations were reused by exact source segment; changed prose was translated by the agent and protected code/inline/link structures retained. Source commit is the fixed baseline. Candidate release set remains `hbrs-55709ae0da988b79dc46f144`; latest complete release remains `hbrs-8c6de08010d459a0e87e74f2`. These identify existing release records; this implementation has not been released.

## Final OpenSpec verification

The official verification workflow reviewed the proposal, design, ten delta specs, implementation and scenario evidence below. Completeness, correctness and coherence have no unresolved critical findings. The final integration review corrected the issues described below before acceptance; platform and fixture limits remain explicitly recorded rather than counted as passed.

### Requirement and scenario evidence

| Delta requirement group | Implementation | Verification seam |
| --- | --- | --- |
| Source-bounded ordinary pages, ordering and whole-page failure | `zoteroLibraryPageQuery.ts`, Broker ordinary readers | Node 185 SQL/keyset/hydration; Broker 102; native 185 on all three Windows targets |
| Payload candidates, empty continuation, size limits and complete ambiguity | `notePayloadCodec.ts`, `zoteroNotePayloadResolver.ts`, Broker payload readers | Broker 102 empty first page, later duplicate after 100 candidates, changed attachment content, oversized and unavailable source; codec 102 encoded/decoded bounds |
| Portable Saved Search discovery | Source query, Broker, explicit Workflow member, Bridge registry, CLI `args.rs`/`commands.rs` | Broker 102 duplicate names/25/100/default library/cursor rejection; native 185; CLI schema_mode |
| Process Host slices and trusted cancellation | Broker module-level FIFO and per-call control | Broker 102 cross-instance admission, queued cancellation, active settle retention, translator wait concurrency and late-result suppression |
| Snapshot fixed basis and evidence | Broker snapshot capture/delivery; Workflow snapshot composition | Broker 102 same-count basis change, unavailable tags, 30-minute TTL/batch bounds and callback cancellation; injected Workflow control forwarding |
| Canonical Bridge and MCP projection, page locality | `hostBridgeCapabilityRegistry.ts`, `zoteroMcpProtocol.ts` | 107 capabilities, 108 mirror, 138 attachment downloads, 186 output boundaries |
| Nine inflight MCP admissions and watchdog | `zoteroMcpServer.ts`, ACP diagnostics DTO | 101/105 concurrent acceptance, tenth-call rejection, diagnostic bypass, timeout-retained handlers and circuits |
| Explicit Workflow V12 and complete consumers | `hostApi.ts`, `workflowHostOwners.ts`, package page helper/hooks | 187 exact 23/21/88 conformance; 47/48 complete research bundle pages; 137 ingestion; UI 35/50 |
| Readiness/Synthesis source consumption | Shared artifact readiness and Synthesis adapter | 107 + 178 + UI 48 jointly passed 72 tests; later notes and payloads, complete generated evidence, and artifact UI behavior |

The review corrected omitted snapshot control in Workflow and Bridge projections. REST accepted-connection cancellation now reaches `context.control`; embedded MCP carries the same trusted signal without adding it to semantic DTOs. The existing connection-abort paths signal cancellation; there is no new independent watcher for peer FIN after request-body completion.

Final integration checkpoints:

- `npm exec -- tsx node_modules/mocha/bin/mocha "test/core/107-host-bridge-capabilities.test.ts" "test/core/178-synthesis-host-read-ports.test.ts" "test/ui/48-library-artifacts-column.test.ts" --require test/setup/zotero-mock.ts --exit --reporter dot`: 72 passing.
- 101 MCP, 106 REST server, 138 file locality and 186 output boundaries: 121 passing; 108 MCP mirror run separately: 6 passing.
- UI 35 settings execution: 31 passing; UI 50 settings dialog model: 15 passing.
- `cargo test --locked --manifest-path cli/zotero-bridge/Cargo.toml --quiet`: 122 unit and 11 schema-mode tests passed; `cargo fmt --manifest-path cli/zotero-bridge/Cargo.toml -- --check` passed.
- Host Bridge content and official mirror checks passed again, without source/render drift.
- Literature bundle 47: 23 passing after moving the existing source-query test adapter to cover the whole round trip, including fixture payload creation and repeated import. The preceding run failed with unavailable `Zotero.DB.queryAsync`; production fallback was not added.
- Workflow 187/47/48/137/23 final joint run: 73 passing, 10 fixture-matrix cases pending. `npm run build` passed again with main/sidebar TypeScript and all package checks.
- CLI packaging and governed surface 139/169/170/171/172 joint run: 92 passing, 3 platform/runtime-dependent cases pending.

- Final Broker/payload/source/Bridge/Synthesis/artifact run: `npm exec -- tsx node_modules/mocha/bin/mocha "test/core/102-zotero-host-broker-capability-api.test.ts" "test/core/102-note-payload-codec.test.ts" "test/node/core/185-zotero-library-page-query.test.ts" "test/core/107-host-bridge-capabilities.test.ts" "test/core/178-synthesis-host-read-ports.test.ts" "test/ui/48-library-artifacts-column.test.ts" --require test/setup/zotero-mock.ts --exit --reporter dot`: **162 passing**.
- Broker 102, literature bundle 47 and literature explainer 21: **111 passing** after removing the full-array payload resolver and sharing the fail-closed source-query test adapter.
- Synthesis workflow client 177, Workflow execution seams 48 and collection collector 49: **85 passing**. The audit-state revision retains its canonical digest instead of substituting the native item version.
- Final `npm run build` passed after the detail-count, payload resolver and bounded mapping changes. ESLint over all changed `.ts`/`.js`/`.mjs` files returned zero errors and 17 repository-config exclusions. Prettier checks passed after formatting `notePayloadCodec.ts`; `git diff --check` passed.

Broker detail child counts now use source totals with limit-one queries; ordinary page mapping reuses the existing 100-item/50-ms yield helper. Attachment file resolution and payload stat/read/parse work run outside native admission. FIFO tests cover surviving request order as well as canceled waiters; child note, attachment and annotation queries preserve `canceled` after native settle. Existing mutation effects share the same native slice owner without changing their public contracts.

## Acceptance and spec synchronization

All 17 implementation and acceptance tasks are complete. The official sync workflow merged only this change's ten delta paths: 15 requirements added, 10 modified, four removed. A post-sync comparison verified every added/modified block, every removal, and preservation of the other 108 requirement blocks. No capability was retired and no new Purpose placeholder was created.

`openspec validate --specs` passed **362/362** specs with zero failures. Existing Purpose-placeholder warnings and long-requirement advisories remain; they are unrelated to the synchronized semantics. `openspec validate canonicalize-zotero-host-reads --strict` also passed after synchronization. The change is archived under `openspec/changes/archive/2026-09-06-canonicalize-zotero-host-reads`; the separate active Synthesis acceptance change is outside this work.
