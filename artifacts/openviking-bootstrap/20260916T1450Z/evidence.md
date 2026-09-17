# evidence.md — 关键证据索引

- run_id: `20260916T1450Z`
- 基线：`d75221a75e1e40425edd20c1c5a198c6f1bb6975`（`research/e2e-historical-regressions`），工作区无已跟踪改动。
- 行号只用于定位，不是稳定身份；优先按 `路径` + 符号定位。
- 「验证类型」列：`static` = 阅读源码/配置/文档；`runtime` = 实际执行命令。
- 「复核」列：`主` = 主审计者在主会话直接核实；`子` = 来自子代理侦察报告，未独立复核。

## 1. 基线与环境

| # | 结论 | 证据 | 验证类型 | 复核 |
|---|---|---|---|---|
| E-01 | HEAD / 分支 / 描述 | `git rev-parse HEAD` → `d75221a7…`；`git rev-parse --abbrev-ref HEAD` → `research/e2e-historical-regressions`；`git describe` → `v0.8.3-430-gd75221a7` | runtime | 主 |
| E-02 | 工作区干净（仅 1 个未跟踪输入文件） | `git status --porcelain` → `?? artifacts/openviking_initialization_guide.md` | runtime | 主 |
| E-03 | 与 main 的关系 | `git merge-base HEAD origin/main` → `e210997a11e0054a3cb4ae0656e5cfb96102a09c`；`git rev-list --left-right --count` → 9/428 | runtime | 主 |
| E-04 | 7 个子模块均在记录 commit | `git submodule status` | runtime | 主 |
| E-05 | 工具链 | Node v24.12.0 / npm 11.6.2 / rustc 1.92.0 + `nightly-2026-07-25` / uv 0.9.17 | runtime | 主 |
| E-06 | 插件目标宿主 | `addon/manifest.json` → `strict_min_version: "7.0"`、`strict_max_version: "10.0.*"` | static | 主 |

## 2. 工具状态

| # | 结论 | 证据 | 验证类型 | 复核 |
|---|---|---|---|---|
| E-07 | CodeGraph 索引与当前 worktree 一致且最新 | `codegraph status` → Files 2,143 / Nodes 58,446 / Edges 214,434 / `✓ Index is up to date`；同时提示索引由旧版本引擎建立 | runtime | 主 |
| E-08 | OpenViking 可达 | MCP `health` → `OpenViking is healthy (service initialized, storage: VikingFS)` | runtime | 主 |
| E-09 | 项目 peer 空间 | `~/.openviking/state/ws-identity-cbe8852a7caf.json` → `remote=github.com/leike0813/zotero-agents`；会话落盘 `.meta.json` → `peer_id=github.com-leike0813-zotero-agents` | runtime | 主 |
| E-10 | 既有项目知识（审计开始时） | `peers/github.com-leike0813-zotero-agents/memories/` 仅 1 个文件 `entities/plugin/openviking_connectivity.md`；`resources/` 不存在 | runtime | 主 |

## 3. 阶段 0.5：自动捕获边界

| # | 结论 | 证据 | 验证类型 | 复核 |
|---|---|---|---|---|
| E-11 | 本会话正在被捕获 | `~/.openviking/data/viking/default/user/default/sessions/dsh-a171cd1d-…/{messages.jsonl,.meta.json}`；`.meta.json` → `message_count`、`pending_tokens`、`peer_id` | runtime | 主 |
| E-12 | 自动召回已发生 | 同目录 `.recall_log.json` 记录 9 条被注入 URI | runtime | 主 |
| E-13 | 捕获过滤规则 | `@openviking/dsh-memory-plugin@0.3.2` 的 `capture.mjs`（`captureMessage` 的 source.kind 白名单、`captureToolResults` 分支）+ `config.mjs`（`DEFAULT_CONFIG.captureToolResults=false`、`captureAssistantTurns=true`、`skipSubagentSessions=false`、`captureMode="semantic"`） | static | 主 |
| E-14 | `ovcli.conf` 的 `plugin.*` 不约束 DSH 插件 | `~/.openviking/ovcli.conf` 有 `plugin.autoRecall=false` / `plugin.autoCapture=false` / `plugin.noAutoInject=true`；DSH 插件 `config.mjs` 的 `resolveConfig` 只读 input 与 `OPENVIKING_*` 环境变量 | static | 主 |
| E-15 | 子代理会话也被捕获并提取 | 审计期间 peer 空间由 1 个文件增长到约 27 个，出现 `entities/module/*`、`crate/*`、`ci/*`、`test_infra/*` 等；其中 `events/2026/09/16/host_bridge_crates_reconnaissance.md` 的内容是子代理的**任务指令与交付过程** | runtime | 主 |

## 4. 动态验证（phase 4）

| # | 结论 | 证据 | 验证类型 | 复核 |
|---|---|---|---|---|
| E-16 | 8 个 TS 项目检查全部通过 | 逐条 `npx tsc --noEmit [-p …]` 退出码均 0，无诊断 | runtime | 主 |
| E-17 | Rust workspace 测试全部通过 | `cargo +nightly-2026-07-25 test --workspace --locked --no-fail-fast …` 退出码 0；33 目标 / 351 通过 / 0 失败 / 0 ignored（`validation-rust-synthesis-sidecar.log`） | runtime | 主 |
| E-18 | `zotero-host` 领域 10 个失败 | `run-node-test-shards.ts --domain zotero-host` 退出码 1；`tests/zotero-host/102-zotero-host-broker-capability-api.test.ts:1641,1796,1835,1994,2101,2206,2314,3095,3280`；`130-zotero9-compatibility.test.ts` 2000ms 超时（两次运行 1 与 2 个） | runtime | 主 |
| E-19 | `workflow` 领域 63 个失败 | 分片 `workflow-engine exit=6`、`workflow-packages-literature exit=38`、`workflow-packages-workbench exit=18`、`workflow-packages-tags exit=1`、`workflow-host exit=0`（`validation-workflow-domain.log`） | runtime | 主 |
| E-20 | 失败签名 | `run-node-test-shards --domain zotero-host` → runner 退出码 1；`tests/zotero-host/102-…:1641/:1796/:1835/:1994/:2101/:2206/:2314/:3095/:3280`；`tests/workflow-debug-probe/89:835` 的栈从 `workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:70` 抛出 | runtime | 主 |
| E-21 | Host Bridge CLI 预构建不新鲜 | `node scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs` 退出码 1，`host_bridge_cli_fingerprint_stale`，manifest `2ef15640…` vs current `775433ca…` | runtime | 主 |
| E-22 | Synthesis sidecar 预构建新鲜 | `npm run check:synthesis-sidecar-runtime-freshness` 退出码 0，`e6eef533…`，七平台 | runtime | 主 |
| E-23 | 清单记录的输入路径已失效 | `releases/host-bridge/cli-release.json` 的 `fingerprintInputs` 含 `cli/zotero-bridge/Cargo.toml`、`host-bridge/cli-build-recipe.json`、`host-bridge/contracts/capabilities.v2.json`、`schemas/host-bridge-capabilities.v2.schema.json` —— 逐项 `test -e` 全部 MISS；实际为 `rust/zotero-bridge/*`、`contracts/host-bridge/*` | runtime | 主 |

## 5. 功能与行为（findings 对应）

| # | 结论 | 证据 | 验证类型 | 复核 |
|---|---|---|---|---|
| E-24 | stale 消息的唯一产出点与分类 | `src/modules/zoteroHostCapabilityBroker.ts:14298` `preparedMutationStaleError()` → `("failed","conflict","read","refresh_and_retry_new_operation",{reason:"revision_mismatch"},<msg>)`；全 `src/` 内该消息仅此一处 | static | 主 |
| E-25 | 观测到的 attempt 分类被改写 | 测试输出中的 attempt：`code=execution_failed`、`phase=staging`、`recovery=retry_same_operation`、`details={phase:"staging",recovery:"retry_same_operation"}`、单个 item affectedRef、空 residualRefs | runtime | 主 |
| E-26 | 同形包装点与缺保护的那一处 | `zoteroHostCapabilityBroker.ts:5200-5225`（`upsertNotePayloadAttachment`，函数起 `:5072`）无 `instanceof MutationAuthorityExecutionError` 直通；` :12406`、`:12418`、`:11315` 有；同形另有 `:11339`、`:12407`、`:12421`、`:12655` | static | 主 |
| E-27 | 参数序 | `src/modules/zoteroHostMutationAuthority.ts:109-125` → `(status, code, phase, recovery, details, message, affectedRefs, residualRefs)` | static | 主 |
| E-28 | `workflowWorkspacesByRunId` 无生产清理 | `src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts:52`（声明）、`:152`、`:217`（写）、`:159`（仅测试 reset）；`mode: "new"` 的生产者为 0（仅测试与类型声明） | static | 主 |
| E-29 | `poll.timeout_ms` 在 SkillRunner 路径被丢弃 | `src/providers/generic-http/provider.ts:623` 消费；`grep timeout_ms src/providers/skillrunner/*.ts` → 0 命中；`client.ts:1284-1286` 只透传 `interval_ms` | static | 主 |
| E-30 | `runDialogMap` 只增不删 | `src/modules/skillRunner/surface/skillRunnerRunDialog.ts:411`（声明）、`:4556`（唯一 set）、`:4120`（唯一 clear，shutdown 路径）；无 delete | static | 主 |
| E-31 | 500 条上限重复 | `skillRunnerRunDialog.ts:1354-1355` 与 `:3229-3230` | static | 子 |
| E-32 | 让出策略三处定义 | `zoteroHostCapabilityBroker.ts:17838`、`src/modules/zoteroHost/libraryArtifactReadiness.ts:283`、`src/modules/zoteroHost/zoteroNotePayloadResolver.ts:218-219` | static | 主 |
| E-33 | pref 键常量重复 | `src/backends/registry.ts:29` 与 `src/modules/workflow/settings/workflowSettings.ts:71` 同为 `"workflowSettingsJson"` | static | 主 |
| E-34 | 死导出 + 重复实现 | `src/shared/preactRegionMount.ts:66` `shouldManageRegion` 外部引用 0；`src/sidebar/assistantPanelRenderer.js:47` 同名实现并在 `:140` 导出，同样无外部消费者 | static | 主 |
| E-35 | shutdown 3 秒有界超时是「放弃等待」 | `src/hooks.ts:1106` `PLUGIN_SHUTDOWN_STEP_TIMEOUT_MS = 3_000`；`runShutdownStepWithTimeout` 用 `Promise.race` 后只记录告警继续 | static | 主 |
| E-36 | 受管 runtime 卸载只释放租约 | `src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts:44-58`；`stopLocalRuntime`（`skillRunnerLocalRuntimeManager.ts:4313`）仅由 `src/hooks.ts:1929` 的 UI 动作调用 | static | 主 |

## 6. 文档与实现不一致

| # | 结论 | 证据 | 验证类型 | 复核 |
|---|---|---|---|---|
| E-37 | `tests/core`、`tests/node/core`、`src/handlers` 不存在 | `ls -d` 与 `find src -maxdepth 1 -type d` 实测；根 `AGENTS.md` 目录结构章节仍列出 | runtime | 主 |
| E-38 | `src/modules/*Dialog.ts` 不存在 | `ls src/modules \| grep -i dialog` → 空；`docs/dev_guide.md` §3 仍列出 | runtime | 主 |
| E-39 | 日志视图已并入 Dashboard | `src/hooks.ts:1515-1519` `case "openLogViewer"` → `openTaskDashboard({initialTabKey:"runtime-logs"})`；`docs/dev_guide.md` §8 仍写「独立日志窗口」 | static | 主 |
| E-40 | synthesis repository 版本漂移 | 代码 `rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:32` → `synthesis-repository-foundation.v6`；`docs/synthesis-layer/README.md:152,173` 与 `performance-and-scale.md:51` 写 v5；同目录 `persistence-and-files.md:81,99` 写 v6 | static | 主 |
| E-41 | 表/索引计数未被漂移影响 | `crates/synthesis-repository/src/schema.sql` → `CREATE TABLE` 62、`CREATE INDEX` 51，与文档一致 | runtime | 主 |
| E-42 | harness 页面死链 | `addon/content/harness/index.html:13,16` 链接 prototype 页面；`zotero-plugin.config.ts:190-191` 排除 `!addon/content/harness/prototype-*.html` | static | 主 |
| E-43 | OpenSpec Purpose 占位符 | 364 个 spec 中 139 个含 `TBD - created by archiving change`；`### Requirement:` 共 3,240 条 | runtime | 主 |
| E-44 | Workflow Host API 版本 | `src/workflows/workflowHostContract.ts:55 version:[…,12]`、`:175 WORKFLOW_HOST_API_VERSION` | static | 主 |

## 7. 覆盖缺口与死代码

| # | 结论 | 证据 | 验证类型 | 复核 |
|---|---|---|---|---|
| E-45 | `addon/content` 手写 JS 无 lint 无类型检查 | `eslint.config.mjs` ignores 含 `addon/content/**`；`tsconfig.json` exclude 含 `"addon"`；手写文件为 `content/shared/{markdown-renderer,theme,workflow-number-validation}.js`、`content/harness/harness-host.js`；`addon/bootstrap.js` 与 `addon/prefs.js` 不在 ignores 内 | static | 主 |
| E-46 | 死默认值 | `scripts/run-zotero-test-with-mock.ts:22` `DEFAULT_NODE_TARGET_SCRIPT = "test:node:raw"`；`'test:node:raw' in package.json.scripts` → false | runtime | 主 |
| E-47 | 测试布局事实源 | `scripts/run-node-test-shards.ts`（28 分片 / 272 文件，显式排除 `tests/zotero/**`）；`docs/testing-framework.md` | runtime | 主 |
| E-48 | fixtures 体量 | `du -sh tests/fixtures/*` → `selection-context` 95M 最大；`git ls-files 'tests/fixtures/selection-context/*.pdf'` → 23 个被跟踪 PDF（文件名形态与论文标题一致，本次未记录任何文件名） | runtime | 主 |

## 8. 安全

| # | 结论 | 证据 | 验证类型 | 复核 |
|---|---|---|---|---|
| E-49 | 日志脱敏只按键名 | `src/modules/runtimeLogManager.ts:367-369`（`SENSITIVE_KEY` / `PRIVATE_LOCATION_KEY`）、`:438-443`（键名命中即 `<redacted>`）、`:778`（message 只截断）、`:789`（error.message 只截断）；`:642-676` `normalizeTransport` 的 `url` 不经过 `sanitizeValue` | static | 主 |
| E-50 | 唯一的 token 掩码 helper | `src/modules/hostBridge/mcp/zoteroMcpServer.ts:515 maskToken` → `redactHostBridgeToken`（`hostBridge/server/hostBridgeAuth.ts:110`）；MCP 另对 `query.token` 做 `?token=<redacted>`（`zoteroMcpServer.ts:1092`），授权头只记布尔事实（`requestHeaderFacts`） | static | 主 |
| E-51 | 本次操作事故（按键名脱敏未覆盖 `"root_api_key":`） | 记录在 `findings.md` F-SEC-1；`grep` 复核审计目录无该密钥前 8 位 | runtime | 主 |

## 9. 子代理侦察报告（待核查材料）

以下文件的结论**未被主审计者独立复核**，仅在与主会话核实一致时被引用：

- `knowledge/_scout-acp.md`（500 行）
- `knowledge/_scout-hostbridge.md`（537 行）
- `knowledge/_scout-skillrunner.md`（582 行）
- `knowledge/_scout-synthesis.md`（591 行）
- `knowledge/_scout-workflow.md`（585 行）+ `_scout-content-packages.md`（324 行）+ `_scout-workflow-tests.md`（129 行）
- `knowledge/_scout-ui.md`（424 行）
- `knowledge/_scout-tests-ci.md`（660 行）
- `knowledge/_scout-zoterohost.md`（419 行）

已知工具异常：Host Bridge 侦察子代理报告其会话内 `rg` 会把匹配子串渲染成占位符（真实名 `zotero-acp-bridge` 被显示为 `host-bridge.n`）。主会话本次未复现。**引用这些报告中的路径前建议复核。**
