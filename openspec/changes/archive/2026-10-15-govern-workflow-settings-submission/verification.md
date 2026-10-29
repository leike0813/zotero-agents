# Workflow 提交治理复核与验收

## 基线与结论

行为参照为 v0.8.4 `fe273f37f2093c4a34be15f93e7d46a3b3484791`，修改前源码为 `59e792b8aff16a31a1081a9cff9fbaee1bfee7a5`，分支 `dev`，开始时工作区干净。本次不改公共字段、消息结构、设置版本或依赖；不提交、不切分支，不改归档 change。

本次回归的直接原因是 `148ac3512` 在原始表单 payload 上调用严格 provider 校验，绕过原有 settings domain 的删除处理。空超时以 `null` 表示删除，因此被当作非法 number。其它问题来自同一个边界混淆：显式设置、控件显示默认值与运行归一化结果被当作同一种对象。

| 修前问题 | 根因 | 本次收敛 |
| --- | --- | --- |
| 空超时不能确认 | 严格校验发生在删除标记合并之前 | domain 先处理 patch/完整替换及删除，再统一校验 |
| 关闭自动审批不能确认 | ACP normalizer 省略显式 false，校验器视为无法应用 | provider 保留两种 boolean 值 |
| SkillRunner 空模型默认被拒绝 | 声明的 schema 默认值被当作显式目录覆盖 | 合法默认值接受，未知非空模型继续校验；provider-aware engine 仍要求有效目录 |
| 非法值在刷新或直接执行时消失 | 描述器/执行把宽松归一化当作校验 | 描述器保留显式值；执行与保存/确认使用相同严格边界 |
| 完整刷新取消/预算无效 | 完整目录分支未共用有界生命周期 | setup、launch、initialize、session、cleanup 共用 deadline，取消/过期阻止成功发布 |

先前 200 项定点测试通过但实际提交失败，原因是页面测试止于 payload、宿主测试始于人工合法输入，缺少真实控件到宿主的连接。本次扩展现有集成场景，连接生产 Preact、实际 confirm/dispatcher、设置域、重开与执行上下文；未按每个字段另建单测。

## 实现与调用链

- `workflowSettingsDomain.mergeExecutionOptions` 消费 base/patch 中的 `null`、`undefined`；完整 provider 草稿继续替换。
- `workflowSettings.resolveWorkflowSettingsSubmission` 返回可保存的显式设置及独立运行投影。Dashboard `saveWorkflowDraft`、Web dialog `confirm`、`resolveWorkflowExecutionContext` 共用这个入口。
- 描述器只投影显式设置和显示默认值。保留既有 SkillRunner 有效 legacy model 读取/写入约定；ACP raw ID 不拆后缀，reasoning 不由 model 推导。普通刷新保留非法显式选项；主动上下文切换仍按既有 retention、reasoning cache 和 provider 首模型规则处理。
- Dashboard 保存验证失败保留当前草稿和已有持久设置，整笔保存报错；提交窗口保持打开。外部 provider profile 不解释删除标记。
- `acpBackendProbe` 只保留生产使用的完整目录路径。成功结果在有界 cleanup 后检查取消/deadline，再交给 caller 发布；迟到 adapter 关闭。`acpFormCatalogPreparation` 原有串行、owner generation 与迟到回声门禁继续使用。
- 删除旧原生 `workflowSettingsDialog.ts`、专用 view model、无调用者的 initial-state/保存/run-once 适配及其测试。布局、change-origin 和 execution preview helper 保留。调用检索无旧窗口或定向 probe 引用。
- 主规格同步两项 capability，并修正旧的“非法 provider select 自动回退”场景，使其与显式值保留契约一致。旧归档未改。

批次链路复核：`runWorkflowPreparationSeam` 在计划形成后只解析一次 execution context，交给同一 prepared submission；`submitPreparedWorkflowUnits` 把该上下文交给各 unit。现有两单元、串行 slot 测试增加两次执行选项一致的断言，未新增平行 runner。

## 先红后绿与 Node 验证

修前已复现默认/清空确认失败、false 被丢弃、空模型被拒绝及非法值被归一化删除。probe 测试以修改前 HEAD 临时副本执行，取消、超时、迟到 launch、停滞 cleanup、清理期间取消和 silent session 保留缓存六项失败；临时副本已移除。domain 对 base 中删除标记的扩展断言先失败，修复后通过。

| 检查 | 结果 |
| --- | --- |
| 相关 settings/UI/provider/catalog/probe 测试，见下方命令 | 179 passing；含 25 项完整 probe 场景 |
| `npm run test:node:dashboard` | 13 文件，全部通过 |
| `tests/host-bridge/108-host-bridge-workflow-control.test.ts` | 72 passing；公共 profile 接受 false，number 字段 null 返回结构化 invalid 错误 |
| `tests/workflows/48-workflow-execution-seams.test.ts` | 67 passing；含同批次两单元选项快照一致 |
| `npm run test:node:workflow` | engine/literature/workbench/tags 四 shard 通过；host shard 有下方既有失败 |
| `npm run build` | 通过；含四个共享包检查及主/sidebar/dashboard/synthesis 四份 TypeScript |
| 改动 TS/TSX 的 ESLint、改动文件 Prettier、`git diff --check` | 通过 |
| `openspec validate govern-workflow-settings-submission --strict` | 通过 |
| `openspec validate --specs` | 372 passed，0 failed；旧规格 Purpose/长段落 warning 仍存在 |

相关测试命令：

```powershell
npx --no-install tsx node_modules/mocha/bin/mocha tests/ui/35-workflow-settings-execution.test.ts tests/runtime/181-provider-profile-selection.test.ts tests/runtime/33-provider-backend-registry.test.ts tests/skillrunner/36-skillrunner-model-catalog.test.ts tests/workflows/49-workflow-settings-domain.test.ts tests/dashboard/250-dashboard-workflow-settings-dialog.test.ts tests/ui/50-workflow-settings-dialog-model.test.ts tests/acp/111-acp-backend-probe.test.ts --require tests/setup/zotero-mock.ts --timeout 20000 --reporter dot --exit
```

## Build preflight 与产物

按项目 `zotero-agents-build-preflight` 执行。当前修改未触及原生或 Skill/内容生成输入，以下 freshness 在最终构建时仍成立。

| 组件 | 证据 |
| --- | --- |
| Host Bridge CLI | 七平台 fresh；0.5.7；fingerprint `0e18bc9d76f0135bc4cff1ce38b363a7036e5f73c776ee2423ef4faf99e88f65` |
| Synthesis sidecar runtime | 七平台 fresh；fingerprint `375c285fb1397ac7940db2fbeeb78a4e6758424372babbebf7f83a7915fc7914` |
| ACP WS bridge | Windows 本地 prebuild 通过；sha256 `5efa9797146c430e09bef7af442ff7bc3168d0273e22e3c69c71a9b381bd6e06` |
| Host Bridge 内容、文档同步、canonical validators、builtin manifest | 通过；manifest 162 文件，文档同步 27 项 advisory 深度提示 |
| 三个内置 Skill submodule | gitlink 身份匹配、clean |
| topic-synthesis 四包、literature-deep-reading 模板及 builtin 包 | 隔离重生成逐字节一致，无 tracked 生成物漂移 |
| `npm run check:help-docs` | 504 docs、53 assets、6291152 bytes，一致 |
| `npm run check:synthesis-sidecar-runtime-xpi -- --xpi=.scaffold/build/zotero-agents.xpi` | 七平台齐全，无 missing/forbidden |

实机 runner 重建 `.scaffold` 后，最后再次执行生产构建并核验交付 XPI：`.scaffold/build/zotero-agents.xpi`，sha256 `76e8dc069001b279a4c47cbef17972994a24e67d9b09fd76cd2631bdad39f46f`。非原生 preflight 详细日志在本机 `%TEMP%/zotero-agents-preflight-59e792b8/`。

## Zotero 实机验收

复用 `npm run test:zotero:e2e`、Committed Seed、隔离 profile/data 和当前源码本地 sidecar。Zotero 10 选择 foundation + WS-01/02/03；7/9 选择 foundation + WS-01。所有结果以 Run Manifest 为准，实际版本不替代兼容矩阵固定版本。

| 实际版本 | 场景与结果 | 最终 Run Manifest |
| --- | --- | --- |
| 10.0.2 Windows x64 | 4 selected / 4 passed，complete | `414631da-010e-4a42-ba52-e726738b3a1f` |
| 7.0.32 Windows x64 | 2 selected / 2 passed，complete | `c9887da5-9576-42d3-a1a9-f4c55c1c84e8` |
| 9.0.6 Windows x64 | 2 selected / 2 passed，complete | `abca3dba-88a3-44be-a23e-5f688777b8c8` |

Manifest 路径为 `artifacts/test-diagnostics/system-e2e/<id>/run-manifest.json`。WS-01 包含两种后端默认确认、单次设置、旧超时删除、false 保存/重开、无 ACP 配置覆盖及 1200 秒 fallback；WS-02 包含两种后端 Dashboard 保存重开、布尔往返、Host queue 保留和 ACP 提供商切换后继续输入；WS-03 保留非法模型并拦截确认，再切换提供商立即确认，验证完整 raw ID、独立 reasoning 和未失焦超时输入。

早期失败收据保留：一次共享 `.scaffold` 并行 build 发生文件竞争；随后修正了 test bundle 的 workflow/toolkit 绑定、三按钮 footer 假设及 Dashboard 的测试挂载。Dashboard 最终使用已有嵌入式生产入口；原生 Dashboard wrapper 的该测试回调挂载没有形成 frame，不记为通过。上述 harness 失败没有作为产品通过证据；最终用例没有替代生产合并、校验或保存规则。

## 独立发现与验收边界

`tests/workflows/187-workflow-host-contract-governance.test.ts:364` 的 “keeps official built-ins on exact v12 without native escape hatches” 修前即失败。扫描发现 `workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs` 与 `workflows_builtin/mineru/hooks/applyResult.mjs` 仍有 `globalThis.Zotero` 引用。本次未修改这两个文件，未将 host shard 或 workflow 域报告为全绿。

本次实机验证覆盖表单、真实宿主、持久化、重开及运行选项解析；后端目录是合成缓存，未发起真实远程 Agent/SkillRunner 任务。未运行全仓 `npm test`、完整 System E2E catalog 或发布门禁；本次没有发布、提交或修改用户真实库。
