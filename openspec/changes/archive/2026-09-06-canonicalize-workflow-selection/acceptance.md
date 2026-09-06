# Selection implementation evidence

Implementation baseline: `4e1cb8ace4aaf0dbd4c3ccf677365cf1ac90ad46`.
Cumulative governed baseline: `4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`.

## Approved deletion inventory

- DEL-01/02/05 selection subset: old current/selected exports, partial Broker projection and casts, snapshot transport repagination.
- DEL-06: raw selection tree/schema and serializers, native/id-only selection inputs, repeated live acquisition and preparation fallback, source path aliases in selection/task DTOs.
- DEL-07: unused sourceSelection module and referencesNote selection helpers, rich selection helpers and runtime aliases with no remaining consumers.
- Governed semantic replacements are limited to selection snapshots, promotion, incomplete refs, rich context, repagination and failure recovery that reacquires input silently. All unrelated instructions remain preservation-required.

## Caller and result inventory

| Boundary | Producer / consumer | Required result |
| --- | --- | --- |
| Broker | context current/selection; attachment detail | Exact pages, small tree-source view, creation facts |
| Workflow V12 | hostApi / workflowHostOwners | Explicit member projection and trusted control |
| Acquisition | workflowExecute, workflowMenu, preparationSeam, ACP context, selectionSample, workflowDebugProbe | One completed locked acquisition; explicit refs bypass UI |
| Planning | selectionContext, workflowInputPlanning, declarativeRequestCompiler, runtime | Ordered facts, task policy, immutable membership, portable task identity |
| Execution | requestMeta, run/apply seams, sequence, ACP adapter/recovery, SkillRunner continuation/provider | Ref-preserving task metadata and apply-back |
| Remote | registry, REST, MCP, workflow control/agent-run store, CLI | Canonical page forwarding, complete refs, no legacy fallback |
| Built-ins | 43 manifests per guide section 6.1 | Named source policies and final file descriptor resolution; debug migrator retained |
| Documentation | schemas, component docs, affected workflow docs, governed sources | Current contract and source-owned rendering |

Manifest inventory was re-enumerated from every `workflows_builtin/**/workflow.json`: 43 total (19 Literature Workbench, 1 MinerU, 4 Synthesis, 19 Debug Probe). All four literature-source workflows share the named planner policy; MinerU uses input-member with PDF filters; metadata/tag/import policies keep their declared member/grouping rules; note export and digest image use their named selectors; bundle/debug/whole-selection consumers receive the canonical array. `debug-migrate-note-payloads` remains present. Its selection acquisition was migrated; removing its entrance belongs to the artifact change.

## Validation evidence

- `openspec validate canonicalize-workflow-selection --strict`: passed.
- Focused Node suites `10/11/48/55/56/59/89/154/164/173/selection-canonical`, with the existing Zotero mock and `--timeout 15000 --exit`: 168 passed. Log: `/tmp/selection-focused-final.log`.
- Broker/REST/registry/MCP/workflow control and agent surface `101/102/106/107/108/169`: 310 passed; log `/tmp/selection-transport-final.log`. The final focused rerun after durable handoff changes covered `154/173/108`: **125 passed**.
- Rechecked migrated core fixtures `124/134/137/156/160/164-bundled-help-center`: 83 passed; log `/tmp/selection-core-fixtures-recheck.log`. Pass-through/duplicate guard/ACP adapter `37/51/130`: 25 passed; log `/tmp/selection-extra-fixtures.log`. Attachment downloads `138`: 13 passed; log `/tmp/selection-downloads-final.log`.
- `npx tsc --noEmit` and `npx tsc --noEmit -p tsconfig.sidebar.json`: passed. `npm run build`: passed; log `/tmp/selection-build-complete.log`.
- `cargo test --manifest-path cli/zotero-bridge/Cargo.toml`: 123 unit and 11 schema integration tests passed; log `/tmp/selection-cli-complete.log`.
- `npm run test:node:ui -- --timeout 15000`: 172 passed, 7 conditional skips. The initial 2-second run reported four harness timeouts and three selection-fixture failures; canonical fixtures were repaired and the suite rerun. Log: `/tmp/selection-ui-recheck.log`.
- `npm run check:host-bridge-content` and `npm run check:host-bridge-review-mirror`: passed. The combined `check:host-bridge-surface` stops at stale `host-bridge/release-set.json`; the five-change release preparation owns that release identity, so this change does not regenerate or publish it.
- Changed tracked files pass Prettier and ESLint (the repository configuration ignores 30 workflow hook files); logs `/tmp/selection-changed-format-check.log` and `/tmp/selection-changed-eslint-resumed.log`. Whole-repository `lint:check` initially reported 16 formatting failures; the changed selection files were corrected. The untouched harness still has an ESLint issue at `src/modules/harness/assistantReadonlyPublication.ts:1547`. Unrelated baseline formatting and harness lint are not silently marked passed.
- Resumed `npx tsc --noEmit`: passed, log `/tmp/selection-tsc-resumed.log`. `openspec validate --specs`: 362 passed, 0 failed, with existing placeholder Purpose warnings; log `/tmp/selection-specs-resumed.log`. All eight delta capabilities match their main-spec requirement bodies and scenarios, including the removed snapshot requirement.
- MinerU malformed source path regression: existing test failed before restoring the shared existence probe's false-on-failure behavior. That test and the two conversation/custom export checks then passed (3 total), logs `/tmp/selection-policy-red.log` and `/tmp/selection-policy-green.log`. Planner/canonical selection follow-up: 19 passed, `/tmp/selection-planning-resumed.log`.
- Current-view review found native library/collection numeric identity collisions could misclassify a library row. The serializer now requires a collection row before collection lookup; the 102 suite including the collision regression passes all 78 cases (`/tmp/selection-102-audit-final.log`).
- Remote parser and durable records reuse SelectionContext's complete portable-ref validator. The 108 selection/explicit/portable/durable/incomplete focused run passes 13 cases (`/tmp/selection-ref-validation.log`).
- `npm run test:node:workflow:full -- --timeout 15000 --exit`: all 279 passed after migrating remaining legacy fixture inputs and bundle helper calls (`/tmp/selection-workflow-final.log`). The prior 263-pass/16-failure run is superseded. Targeted full-mode literature fixture matrix (10) and mock e2e (1), bundle (23) and collection collector (6) were also rerun during repair.
- Final local build after the durable sequence and handoff changes: `npm run build` passed on September 6, 2026, including help-doc generation, Synthesis package checks, plugin packaging, TypeScript and sidebar type checking.

## Selection closure

The caller/deletion audit is recorded in `surface-review.md`. Its four selection closure counters are all zero: unmigrated consumers, legacy producers, duplicate Host acquisition and unauthorized promotion/dedupe. The audit explicitly excludes test-only fixture builders and the unrelated task-dashboard `targetParentID` projection.
- Before-edit materialized metrics and fixed-baseline depth/parity results are recorded in `surface-baseline.json` and `surface-review.md`.

## Native runtime evidence

The following runs use the compatibility runner, actual downloaded pinned Zotero binaries, isolated test profiles, and the dirty implementation artifact. They do not assert Windows/macOS compatibility.

Command template: `ZOTERO_TEST_GREP='selection-context rebuild|zotero library page query in Zotero runtime' npm run test:zotero:compatibility:run -- --target <target> --mode behavior --suite lite --domain core --timeout-ms 180000`.

| Target | Result | Receipt |
| --- | --- | --- |
| Zotero 10.0.1 Linux x64 | 5 passed | `/tmp/zotero-agents-compat/zotero-10-linux-x64-behavior-lite-c96e65db-2d86-49f2-a52b-dbed9ccba330/receipt.json` |
| Zotero 9.0.6 Linux x64 | 5 passed | `/tmp/zotero-agents-compat/zotero-9-linux-x64-behavior-lite-896973a5-cb32-4b9c-9529-e78a9683deb5/receipt.json` |
| Zotero 7.0.32 Linux x64 | 4 passed, native child/source case exceeded 10-second test timeout | `/tmp/zotero-agents-compat/zotero-7-linux-x64-behavior-lite-9f5adb08-e813-418a-a449-85f7cf0fafb0/receipt.json` |
| Zotero 7.0.32 single failed case rerun | 1 passed, grep `pages native child, collection and Saved Search identities` | `/tmp/zotero-agents-compat/zotero-7-linux-x64-behavior-lite-ff92bfc1-909f-4708-a3b2-0d1a2c2dc811/receipt.json` |
| Zotero 10.0.1 settings UI | 2 passed; remaining cases skip outside full mode | `/tmp/zotero-agents-compat/zotero-10-linux-x64-behavior-lite-875e01bf-4bc4-4412-b77e-0582446aaf39/receipt.json` |
| Zotero 10.0.1 MinerU and note import/export after fixes | 24 passed; grep `workflow: literature-workbench import/export notes|workflow: mineru` | `/tmp/zotero-agents-compat/zotero-10-linux-x64-behavior-lite-20c6d07f-e876-4af0-9ab7-0c1209c7c206/receipt.json` |
| Zotero 10.0.1 current-view identity after collection-row fix | 1 passed; grep `pages native child, collection and Saved Search identities` | `/tmp/zotero-agents-compat/zotero-10-linux-x64-behavior-lite-a71af862-6c8b-4011-b378-7dfc03ec730d/receipt.json` |
| Zotero 7.0.32 current-view identity after collection-row fix | 1 passed, same grep | `/tmp/zotero-agents-compat/zotero-7-linux-x64-behavior-lite-6fb3e38c-a049-41ab-98e4-f85e752fef5b/receipt.json` |
| Zotero 9.0.6 current-view identity after collection-row fix | 1 passed, same grep | `/tmp/zotero-agents-compat/zotero-9-linux-x64-behavior-lite-b529dbb5-5525-4228-8ac2-fe0c5df75783/receipt.json` |

Initial native attempts before the build existed failed setup with `plugin_artifact_unavailable`; those are superseded by the real runs above. Workbench/MinerU native checks initially exposed debug live-selection fallbacks, outdated export fixtures and unavailable-file handling; all 24 applicable native cases pass after the fixes and rebuilt XPI (`/tmp/selection-build-resumed.log`, `/tmp/selection-native-workflow-resumed.log`).

## Validation boundaries

The broad Node core run completed with 3260 passing, 66 pending and 28 failures (`/tmp/selection-core-complete.log`). The focused reruns above supersede repaired fixture and generated-content failures, but do not imply the entire suite is green. Isolated checks still reproduce the Synthesis cross-language contract fingerprint failure and two native Reference index assertions; these are outside the selection change. Runtime diagnostics release elision also fails on existing missing exports. Native evidence covers pinned Zotero 7, 9 and 10 Linux x64; Windows and macOS were not run. These are recorded validation boundaries, not unresolved requirements of this change.
