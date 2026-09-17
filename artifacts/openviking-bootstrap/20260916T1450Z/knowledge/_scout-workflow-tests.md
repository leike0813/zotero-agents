# 工作流相关测试覆盖侦察报告（只读）

任务：调研工作流相关测试覆盖，范围严格限定在测试目录。
方法：`ls`/`find`/`rg`/`read` 只读侦察；未修改任何文件（本报告除外，系任务指定产物）。
用例计数口径：`grep -cE "^\s*(it|test)(\.each|\.skip|\.only)?\(" <file>`，即 `it/test` 声明数，`.each` 参数化不展开，故是"数量级"而非精确执行用例数。括号内为文件内 describe 数。

结论先行【事实】：工作流测试共 53 个 `.test.ts` 文件、约 587 个 `it/test` 声明，全部落在 **Node + Zotero mock** 层；真实 Zotero 层只有 1 个工作流文件（`tests/zotero/workflow/lite/174-*.test.ts`），E2E 层 0 个。

---

## 1. `tests/workflows/`（28 个文件，379 个 it/test）

| 文件（describe 行号 / 主题） | 用例 |
|---|---|
| `20-workflow-loader-validation.test.ts:365` workflow loader validation：manifest/hooks 字段接受与拒绝 | 31 it |
| `24-workflow-execute-message.test.ts:10` 执行摘要消息格式化与错误归一化 | 6 it |
| `41-workflow-scan-registration.test.ts:41` 扫描默认目录、启动建目录、prefs 事件扫描与注册摘要 | 11 it |
| `47-workflow-log-instrumentation.test.ts:52` apply 诊断日志边界与成功/失败日志 | 4 it |
| `48-workflow-execution-seams.test.ts:202` 执行 seam 总集：槽位重取/取消/终态解析/并发/ACP 序列 | 67 it |
| `49-workflow-settings-domain.test.ts:23` settings 文档解析序列化、backend 归属、必填参数 | 19 it |
| `51-workflow-duplicate-guard-seam.test.ts:48` 重复运行守卫与顺序询问 | 7 it |
| `54-workflow-summary-counter-utils.test.ts:7` 摘要计数标签匹配与缺失报错 | 3 it |
| `55-workflow-apply-seam-risk-regression.test.ts:95` HR-02 apply 风险回归（缺队列/父项未解析/缺 requestId） | 13 it |
| `87-workflow-package-runtime-diagnostics.test.ts:16` 包运行时日志与 verbose 控制台诊断开关 | 3 it |
| `88-workflow-runtime-scope-diagnostics.test.ts:26` hook 执行开始/失败日志与 locale 归一化 | 4 it |
| `89-workflow-debug-probe.test.ts:122` 调试探针分类、preflight 不跑 buildRequest、诊断表格 | 15 it |
| `90-workflow-host-api-file-picker.test.ts:51` 文件/目录选择窗口回退（Node-only 套件） | 15 it |
| `90-workflow-input-materialization.test.ts:12` 输入物化到 run tmp、歧义拒绝、身份作用域 | 9 it |
| `90-workflow-note-image-preparation.test.ts:54` note 图片准备、run 级 ref、终态清理 | 10 it |
| `90-workflow-stored-attachment-import.test.ts:63` staged 路径私有、快照重校验、companion 冲突 | 7 it |
| `91-workflow-host-api-archive.test.ts:39` archive facade 往返、本地 file URL 度量、hash 回退 | 13 it |
| `109-workflow-result-context.test.ts:24` provider resultJson/本地 artifact 结果上下文与路径归一化 | 8 it |
| `134-manuscript-literature-framing-workflow.test.ts:13` synthesis-layer 内置包契约与注册 | 8 it |
| `135-workflow-product-storage.test.ts:32` ACP/SkillRunner 产物缓存与二进制完整性 | 22 it |
| `137-literature-search-ingest-workflow.test.ts:90` literature-search-ingest 参数本地化与 collection 解析 | 21 it |
| `156-debug-sequence-probe-workflows.test.ts:65` debug probe 包加载、sequence 探针、debug 过滤 | 9 it |
| `159-workflow-i18n.test.ts:69` 工作流文案本地化回退与 skill 名投影 | 7 it |
| `162-workflow-single-result-integration.test.ts:625` 单结果集成：前台续跑、terminal 映射、apply 失败不改写成功 | 17 it |
| `164-workflow-host-queue-management.test.ts:74` Host 提交队列 FIFO/并发/槽位保持 | 15 it |
| `173-workflow-input-planning-v2.test.ts:84`（嵌套 describe `:117` manifest contract、`:262` confirmed planning） | 14 it |
| `176-workflow-run-result-bundle-reader.test.ts:22` bundle 读取器 zip/目录/不可用与 dispose | 5 it |
| `187-workflow-host-contract-governance.test.ts:131` v12 manifest 身份、投影一致性、递归漂移校验 | 16 it |

注：`90-` 前缀被 4 个文件共用（编号冲突，非功能问题）。

## 2. 其他 `tests/workflow-*/`（11 个目录，41 个 `.test.ts`，约 208 个 it/test）

- `tests/workflow-literature-analysis/`（22 it）：`21-…test.ts:562` 主流程与校验（14 it）；`22-…filter-inputs.test.ts:173` validateSelection 选文回退（4 it）；`23-…fixtures.test.ts:411`/`:433` 参数化 fixture 稳定性（2 it）；`24-…sequence-apply.test.ts:12` 逐步 apply 声明（1 it）；`50-…mock-e2e.test.ts:81` mock E2E 全链路（1 it）。辅助：`workflow-test-utils.ts`、`testMode.ts`（re-export `../zotero/testMode`）、`literature-analysis-fixture-cases.ts`。
- `tests/workflow-literature-deep-reading/`（13 it）：`158-…test.ts:134` 深读工作流（ZIP 字节、manifest、apply）。
- `tests/workflow-literature-explainer/`（7 it）：`21-…test.ts:109` 解释器工作流与 conversation note（2 it）；`22-…filter-inputs.test.ts:163` 选文规则（5 it）；辅助 `workflow-test-utils.ts`。
- `tests/workflow-literature-metadata-curator/`（28 it）：`171-…test.ts:272` metadata curator 自动化资产与 manifest。
- `tests/workflow-literature-translator/`（10 it）：`160-…test.ts:90` 译者工作流路径归一化与 manifest。
- `tests/workflow-literature-workbench-package/`（71 it）：`45-…note-import-export.test.ts:399` 笔记导入导出与父集重放（22 it）；`46-…import-validation.test.ts:53` canonical artifact schema（4 it）；`47-…literature-bundle.test.ts:328` 可移植 bundle 出/入（27 it）；`48-…research-bundle.test.ts:149` research bundle（12 it）；`49-…collection-collector.test.ts:38` 集合收集器（6 it）。
- `tests/workflow-mineru/`（7 it）：`39-…test.ts:116` 每个 PDF 一条请求、路径解析失败跳过；辅助 `workflow-test-utils.ts`。
- `tests/workflow-tag-auditor/`（7 it）：`66-tag-compliance.test.ts:129` 受控词表外标签判定。
- `tests/workflow-tag-bootstrapper/`（10 it）：`64-…test.ts:176` tag 标准路由与无选择辅助工作流。
- `tests/workflow-tag-regulator/`（32 it）：`64-workflow-tag-regulator.shared.ts:811/:821/:829` 三个注册块（request building 7 + apply intake 24 + dialog rendering 1）；`64a/64b/64c-*.test.ts` 均为 3 行 shim，仅调用 `register*Tests()`（`:1`）；`65-…mock-e2e.test.ts:462`/`:504` mock E2E（2 it）；辅助 `tagRegulatorSaveTxLoadProbe.ts`。
- `tests/workflow-tag-vocabulary/`（0 it）：**只有** `hostApiTestUtils.ts`（280 行 helper），无任何 `.test.ts`；被 `65-…mock-e2e.test.ts:26` 与 `64-…shared.ts:35` 引用。

## 3. 测试分层

【事实】Node 层：`scripts/run-node-test-shards.ts:80` 固定 `TEST_SETUP_FILE = "tests/setup/zotero-mock.ts"`，`:437` 给每个 shard 追加 `--require`；`:307-349` 定义 5 个 workflow shard（`workflow-engine` / `workflow-host` / `workflow-packages-literature` / `workflow-packages-workbench` / `workflow-packages-tags`），`:93-97` 的 `inDirectory` 只收 `tests/<dir>/*.test.ts`。因此 `tests/workflows/` 与 `tests/workflow-*/` 属于"Node 进程 + Zotero mock（3135 行）"层，不是无依赖纯单测。

- 纯 Node（文件内无 `Zotero.`/`ztoolkit`/`IOUtils`/`Services` 引用，rg 扫描）：`tests/workflows/24-…test.ts`、`49-…test.ts`、`51-…test.ts`、`54-…test.ts`、`55-…test.ts`、`173-…test.ts`、`187-…test.ts`；`tests/workflow-tag-auditor/66-…test.ts`、`tests/workflow-tag-bootstrapper/64-…test.ts` 等。
- 依赖（mock）Zotero API：`tests/workflows/48-…test.ts`（94 处 Zotero/ztoolkit 引用）、`90-workflow-host-api-file-picker.test.ts`（23 处）、`41-…test.ts`（11 处）；`tests/workflow-tag-regulator/64-…shared.ts:2-20` 显式安装 `nodeZoteroTransactionStub`、mock 分页适配器、runtime bridge override。
- 双运行时守卫：`tests/zotero/workflow-test-utils.ts:10-16` 的 `isZoteroRuntime()` 要求同时存在 `IOUtils` 与 `PathUtils`；mock 只安装 `PathUtils`（`tests/setup/zotero-mock.ts:3104`）且带 `__parity.runtime = "node-mock"`（`:198-199`），故 Node 下恒为 false。守卫用法见 `tests/workflows/90-workflow-host-api-file-picker.test.ts:51`（`describe.skip`）、`tests/workflow-tag-regulator/64-…shared.ts:51`（`itNodeOnly = it.skip`）。
- 真实 Zotero 层：仅 `tests/zotero/workflow/lite/174-workflow-archive-zotero-runtime.test.ts:5-16`（`getRealZoteroRuntime()` 排除 `node-mock`）、`:23-25`（非真实运行时 `this.skip()`）；只测 archive ZIP 往返。`tests/zotero/workflow/full/` 目录不存在（`ls tests/zotero/workflow`）。
- 邻近的真实运行时工作流相关覆盖：`tests/zotero-host/130-zotero9-compatibility.test.ts:342-349` 在 Node 中装 Zotero 9 风格 sandbox 后断言 loader `isZoteroRuntime() === true`，并覆盖 `:217` rootURI 读取回退、`:422` Zotero 7–10 manifest 兼容。
- E2E 层：`tests/zotero/e2e/full/` 只有 `300-lisongtao-gold.zotero.test.ts:60`（Synthesis gold library），全文 `workflow` 出现 0 次 → 无工作流 E2E。

## 4. 关键覆盖点

- 工作流包加载/校验（loader）：`tests/workflows/20-workflow-loader-validation.test.ts:374`（接受声明式 request+applyResult）、`:429`（缺 preflight 导出即拒绝）、`:1836`（拒绝废弃字段）；`tests/workflows/41-workflow-scan-registration.test.ts:208`/`:247`（目录默认值与启动创建）；fixtures：`tests/fixtures/workflow-loader-{invalid-json,missing-apply,missing-required-fields}/`；`tests/zotero-host/130-zotero9-compatibility.test.ts:217`。
- Workflow Host API 版本兼容：`tests/workflows/187-workflow-host-contract-governance.test.ts:134`（精确 v12 manifest/metadata 身份）、`:174`（interactive/non-interactive v12 投影同形）、`:204`（内置包钉 v12、无 native 逃生口）、`:246`（内置包兼容策略）；`tests/zotero-host/102-zotero-host-broker-capability-api.test.ts`；helper 入口 `tests/workflow-tag-vocabulary/hostApiTestUtils.ts:1-16`。
- sequence 执行与重试/取消：`tests/workflows/48-workflow-execution-seams.test.ts:203`（让出槽位后重取）、`:255`（resumption admission 取消则跳过 apply）、`:4034`（由 canonical canceled 状态结算运行中 ACP job）、`:4096`（已取消则跳过 apply）；`tests/workflows/162-workflow-single-result-integration.test.ts:675`/`:704`（前台续跑可恢复 vs 终态 client error）、`:1245`（waiting_user 脱离并恢复）、`:1492`（failed/canceled 不 apply）；`tests/skillrunner/154-skillrunner-sequence-runtime.test.ts:215`（`skillrunner.sequence.v1`）、`:509`（前台续跑步上下文）、`:700`（sequence manifest 校验）；`tests/tooling/196-sequence-state-reducer.test.ts:71`。
- settings 读写：`tests/workflows/49-workflow-settings-domain.test.ts:2-16`（引入 `parseSettingsRecord`/`serializeSettingsRecord`/`normalizeSavedWorkflowSettings`）、`:24`/`:58`/`:90`（backend 身份归属与漂移）；`tests/ui/35-workflow-settings-execution.test.ts:39`（执行期 settings，4 it）；`tests/ui/50-workflow-settings-dialog-model.test.ts:48`/`:234`（Host settings 对话框模型，8 it）。
- 输入准备（input planning）：`tests/workflows/173-workflow-input-planning-v2.test.ts:84`/`:117`/`:262`（v2 协议、manifest 边界、confirmed planning）；`tests/workflows/90-workflow-input-materialization.test.ts:12`/`:49`/`:77`；包侧 `tests/workflow-literature-analysis/22-…:173`、`23-…:411`/`:433`；`tests/workflow-mineru/39-…:133`。
- 结果产出（result envelope / apply seam）：`tests/workflows/55-workflow-apply-seam-risk-regression.test.ts:104`/`:135`/`:174`（三类失败改写）、`:771`（bundle-entry 路径错误进入 failureReasons）；`tests/workflows/109-workflow-result-context.test.ts:24`；`tests/workflows/162-…:1531`（apply 失败不改写 provider 成功）；`tests/workflows/176-workflow-run-result-bundle-reader.test.ts:22`；`tests/workflows/47-workflow-log-instrumentation.test.ts:52`（apply 诊断）。
- host bridge workflow：`tests/host-bridge/108-host-bridge-workflow-control.test.ts:256`（host bridge workflow control，72 it）、`:331`（静态 manifest 契约投影）、`:421`（列表不泄漏实现路径）、`:445`/`:468`（debug-only 工作流可见性）；MCP 侧 `tests/host-bridge/108-mcp-host-bridge-mirror.test.ts:30`。

## 5. 无直接测试引用的引擎模块（对照 `src/`）

判定：在 `tests/` 内按 `import ... from ".../<basename>"` 反查为 0，且导出符号在 `tests/` 内 rg 命中为 0。

| 模块 | 证据 |
|---|---|
| `src/workflows/errorMeta.ts` | `attachWorkflowHookFailureMeta`/`summarizeWorkflowExecutionError` 在 tests/ 命中 0（被 `src/workflows/runtime.ts:35` 与 `src/modules/workflowExecution/preparationSeam.ts:16` 使用） |
| `src/workflows/triggerPolicy.ts` | `canWorkflowRunWithoutSelection`/`requiresWorkflowSelection` 命中 0 |
| `src/workflows/zoteroHostAccessOptions.ts` | 文件本身与 `normalizeAutoApproveZoteroWrites`/`workflowAllowsWriteApprovalBypass` 命中 0 |
| `src/modules/workflowExecution/acpSequenceStepLifecycle.ts` | 唯一导出 `acpSequenceStepLifecycle` 命中 0 |
| `src/modules/workflowExecution/feedbackPolicy.ts` | `shouldShowWorkflowNotifications` 命中 0 |
| `src/modules/workflowExecution/requestMeta.ts` | 三个导出（parent ref / task name / input unit identity）命中 0 |
| `src/modules/workflowExecution/resultEnvelope.ts` | `unwrapSkillRunnerResultJson` 命中 0 |
| `src/modules/workflowExecution/runConcurrency.ts` | `resolveWorkflowDispatchConcurrency` 命中 0 |
| `src/modules/workflowExecution/sequenceStepApply.ts` | `executeSequenceStepApply` 命中 0 |
| `src/modules/workflowExecution/valuePath.ts` | `primitiveEquals`/`getDotPath` 命中 0 |

薄覆盖（仅 1–2 个直接引用，且都非专项文件）：`src/modules/workflowExecution/sequenceRuntime.ts`（`tests/workflows/156-…`、`tests/skillrunner/154-…`）、`runSeam.ts`（`48-…`、`162-…`）、`submissionSeam.ts`/`terminalResolution.ts`（仅 `48-…`）、`workflowInputMaterialization.ts`/`workflowStoredAttachmentImport.ts`（仅各自 90- 文件）。
【推测】上述模块很可能通过 `src/workflows/runtime.ts`（25 个测试文件引用）与 `sequenceRuntime.ts` 被间接执行到，但没有任何断言直接指向它们的行为边界；是否真的被覆盖需覆盖率或注入式验证，本次未做。

## 6. 运行方式（`package.json`）

- `test:node`（`:139`）：`tsx scripts/run-node-test-shards.ts` —— 全部 Node shard。
- `test:node:workflow`（`:150`）：`tsx scripts/run-node-test-shards.ts --domain workflow` —— **跑本报告 §1、§2 全部目录**，Node only。
- `test`（`:114`）：`npm run test:node`。
- `test:zotero:workflow`（`:127`）：`tsx scripts/run-zotero-test-with-mock.ts test:zotero:cli lite workflow` —— 只收 `tests/zotero/workflow/lite`（`zotero-plugin.config.ts:39`），当前仅 174 一个文件，且它在 mock 下自我 skip。
- `test:zotero:workflow:full`（`:128`）：同上 `full workflow`，收 lite+full（`zotero-plugin.config.ts:44`）；`full` 目录不存在。
- `test:zotero:core` / `test:zotero:ui` / `test:zotero:e2e`（`:123`/`:125`/`:129`）：真实（或 mock 包装的）Zotero 域；E2E 仅 Synthesis gold 用例。
- 其他入口：`test:zotero:case`（`:121`）与 `test:zotero:cli`（`:138` = `zotero-plugin test`）；setup 固定为 `tests/zotero/setup.test.ts`（`zotero-plugin.config.ts:77`）。

结论【事实】：`tests/workflows/`、`tests/workflow-*/` 只能通过 `test:node*` 运行；需要真实 Zotero 的只有 `tests/zotero/**`（`test:zotero:*`）。

## 7. 疑点清单（待核查）

1. `tests/workflow-tag-vocabulary/` 有 280 行 helper 却无任何 `.test.ts`，且目录名属于测试域（`scripts/run-node-test-shards.ts:343-349` 的 `workflow-packages-tags` 会匹配 `tests/workflow-tag-*`，但只收 `.test.ts`，`:95`）→ 这是遗漏还是已迁移？
2. `tests/workflow-*` 内的 `isZoteroRuntime()` 分支（`tests/zotero/workflow-test-utils.ts:10`）在默认运行路径下永远为 false（mock 不装 `IOUtils`，`tests/setup/zotero-mock.ts:3104`）；这些 Zotero 分支是否真的被谁执行过？`ZOTERO_TEST_ENTRY` 只在 `zotero-plugin.config.ts:101` 被读取、仅 `scripts/run-zotero-e2e-stress.ts:13` 设置，故"用 `test:zotero:case` 单跑某个 `tests/workflow-*` 文件"的可行性未验证。
3. `test:zotero:workflow` / `:full` 引用的 `tests/zotero/workflow/full/` 不存在（`zotero-plugin.config.ts:44`）→ 是否应删除该条目或补目录。
4. `tests/zotero/workflow/lite/174-…test.ts:25` 在 mock 下 `this.skip()`：默认 `test:zotero:workflow` 实际上等于零工作流用例通过；是否需要在 CI 增加真实 Zotero 的工作流域。
5. `AGENTS.md` 目录结构写有 `tests/core/`（~100+ 文件）与 `tests/node/core/`，实际均不存在（`find tests -maxdepth 2 -type d` 无 `tests/core`、`tests/node`）→ 文档漂移。
6. 引擎模块 `resultEnvelope.ts` 零引用（§5），但 `109`/`162` 测的是"result context / single-result"：result envelope 的解包语义是否已迁走或仍在使用？
7. `tests/workflows/90-` 四个文件共用编号前缀，`tests/zotero-host/130` 等文件中也存在跨域同号；编号治理是否需要（仅命名问题）。

## 8. 未覆盖范围

- 未运行任何测试、未做覆盖率统计，"未覆盖"仅指静态引用与符号命中为零。
- 未审阅 `tests/acp/`、`tests/assistant/`、`tests/synthesis/`、`tests/skillrunner/`、`tests/tooling/`、`tests/runtime/` 与 workflow 的完整交叉关系，仅按需抽查了 154/196/164/108/130/102 等代表文件。
- 未核对 `openspec/` 规格与测试的对应关系，也未核查 `tests/fixtures/workflow-*` 之外 fixtures 的用途。
- 未评估各文件内 `it` 的实际断言强度、运行时长、是否存在 flaky/跳过用例（除 174 的 `this.skip()`）。
- 未读取 `src/modules/workflow/`（catalog/settings/UI）自身的全部测试映射，仅覆盖 settings 一条线。
