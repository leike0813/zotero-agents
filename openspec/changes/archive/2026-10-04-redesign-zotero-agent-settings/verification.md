# Implementation verification

验证日期：2026-10-04。完整实现按 revision 7 的页面职责与交互交付：引导、模型工作台、MCP、搜索、目录及三个折叠维护分区。真实账户操作由 `replace-builtin-pi-codex-auth-with-chatgpt` 的 5.2/5.3 接续，本文的受控验证不构成这些任务或 C20 的完成证据。

## Candidate and entry

本次为未提交的开发候选，source HEAD 为 `d663e1768b2633c7ae03652e23edfaca01ca7cf0`，工作区包含既有及本次改动，`dirty: true`。

- 宿主矩阵验证 XPI：`.scaffold/settings-final/zotero-agents.xpi`，版本 `0.10.0`。后续语言补全候选见下方记录。
- SHA-256：`f2f18ec52385a31d7b5444f44adb499d7442c4462885e5f35e1684999a105139`。
- 构建身份：Pi enabled、capacity 12、debug false、measurementOnly false，构建时间 `2026-10-04T10:33:09.900Z`。
- 身份工件：[candidate.json](../../../artifacts/pi-agent-runtime/settings-implementation/candidate.json)。最终宿主矩阵使用该同一构建目录；不同的早期受控候选由各自 receipt 记录。
- 用户入口：Zotero 首选项中 **Backend Manager 左侧的 Zotero Agent 设置按钮**。Backend Manager 的固定内置 Agent 摘要和 Workspace 的 Pi 配置动作也打开同一独立窗口；重复打开只聚焦，两个窗口可同时存在。

## Implementation coverage

| Area | Sources and checked behavior |
| --- | --- |
| Connection/card ownership | `piProviderContract.ts`、`piProviderConfiguration.ts` 与消费者：连接与卡片独立、共享密钥、实际卡片 ID、默认保留/准入、删除影响、跨用途最后引用清理与历史保留。|
| Independent host | `zoteroAgentSettings.ts`、`zoteroAgentSettingsPiAccess.ts`、纯 wire contract：frame 准入、对象/请求身份、迟到结果拒绝、订阅与关闭清理、构建排除；首选项/Workspace/Backend Manager 路由。|
| Full page | `src/dashboard/zoteroAgentSettingsApp.ts`、renderer 与区域组件，静态 HTML/CSS：区域 memo、表单/菜单、草稿保护、失败保留、原生窗口握手与关闭、真实 API DTO、所有可用连接的模型入口。|
| ChatGPT | 复用独立注册与 auth owner；登录后发现由宿主持有一次刷新。注册身份、授权取消/重授权、welcome/plan、usage、退出及受控 rotation/late-result 行为由既有用例验证。|
| MCP | `piMcpSourceRegistry.ts`、`piMcpToolSources.ts`：准确 argv/字段绑定、一次 Bearer 前缀、统一事务变更集、失败回滚、预览 revision 冲突、导出无可复用密钥、自动描述符校验与冻结目录、Gateway 效果/审批语义。|
| Search | `piBrokeredWebTools.ts` 与独立页面：测试已保存的禁用来源、不临时启用、不走回退、实际模型优先级、计费确认、身份变更失效与启用/排序保留。|
| Maintenance/docs | 复用 catalog、overlay、global-only diagnostics owner；取消/失败保持已采用数据；源文档、11 语言、类型、生成帮助及项目约束同步。|

新增模型和编辑模型在 payload 中分别明确 `connectionId` 与 `configurationId`，同名 ID 不会改写无关卡片。自定义 API 使用共享 `PiExecutionApi` 和 `PI_API_AUTH_VARIANTS`；本地连接的保存确认按 origin 回显，实际调用保留调用方作用域授权。

## Automated verification

所有日志位于 [logs](../../../artifacts/pi-agent-runtime/settings-implementation/logs/)。失败的开发中间轮次不作为通过证据，下面列出最终结果及适用限制。

| Command | Result |
| --- | --- |
| `npm run test:node:runtime` | 五个 runtime 分片通过：platform/persistence 15、registry 7、execution 18、products 3、task lifecycle 4 个文件。|
| `npx tsx scripts/run-node-test-shards.ts --shard runtime-provider-registry` | 最终连接 origin/模型目标修改后，7 个文件通过；包含 242/243/244/292 及 Backend Manager 风险回归。|
| `npx tsx scripts/run-node-test-shards.ts --shard runtime-provider-execution` | 18 个文件通过，包含 245/246/249/251/261/262 及 Conversation/Skill Run 集成。|
| `npm run test:node:assistant` | 8 个文件通过。|
| `npm run test:node:ui` | UI 16、shared 1 个文件通过。|
| `npm run test:node:dashboard` | 最终 14 个文件通过；设置页 254 为 28 个行为用例。|
| Directed `tests/host-bridge/101-zotero-mcp-server.test.ts` | 71 个用例通过，保留 Gateway/Broker 调度边界。|
| `npx tsx node_modules/mocha/bin/mocha tests/tooling/246-pi-provider-env-guard.test.ts tests/tooling/277-pi-runtime-bundle-size.test.ts --require tests/setup/zotero-mock.ts --exit` | 7 个用例通过。|
| `npm run check:pi-mcp-browser-bundle` | 通过；MCP 浏览器包无 Node/旧版 MCP SDK。|
| Changed-file `npx eslint --no-warn-ignored …` / `npx prettier --check …` / `git diff --check` | 修改及新增的适用文件通过，无 lint 错误或格式差异。|
| `ZOTERO_BUILD_DEBUG=0 ZOTERO_PLUGIN_DIST=.scaffold/settings-final npm run build` | 通过：普通生产构建、四个 Synthesis 包检查、canonical validator、root/sidebar/dashboard/synthesis typing；生成 504 帮助文档和 53 个资产。|
| `npm run check:help-docs` | 生成后检查通过，504 文档、53 资产。|
| `ZOTERO_PI_RUNTIME=0 ZOTERO_PLUGIN_DIST=.scaffold/settings-pi-control npx zotero-plugin build` | 控制构建通过；只用于验证排除。|
| `npm run measure:pi-runtime-bundle` | 最终代码：`sameInputs: true`、`browserGuardPassed: true`、`excludedFully: true`，control Pi inputs 为 0；raw 5,830,660 B、gzip 903,678 B、XPI delta 910,425 B，预算内。开发工作区 dirty，receipt 因 `dirty-worktree` 丢弃，不能作为发布验收通过。|
| `npm run check:localization-governance` | 语言补全后通过；11 个 locale 的 `addon.ftl` 均为 2360 键、`preferences.ftl` 均为 265 键，缺失为 0。初轮既有 Assistant 缺口与后续修复详见下方记录。|
| `openspec validate redesign-zotero-agent-settings --strict` | 通过。|

Pi 排除验证曾发现未受常量控制的动态 import 保留了 Pi 执行图，已修正为构建器可裁剪的正向条件。实机验证发现并修复了 frame 来源丢失、原生关闭绕过草稿确认、确认层 memo 输入缺失、Preact 输入提交时序、API 简写逃逸与自定义/ChatGPT 模型入口遗漏；对应稳定行为已纳入现有测试。

## Installed Zotero evidence

现有 UI runner `npm run test:zotero:ui -- --no-watch` 最终 5 个用例通过；定向 core 278/283/285/287/289 最终 48 个用例通过。所有库、profile 和凭据输入均为测试副本或合成数据。没有真实账户登录、生产推理或用户数据清理。

真实 UI 证据包含五页 × 普通/紧凑 × 明/暗共 20 个截图，以及 stdio 精确参数、Bearer 表单、搜索编辑、整份 MCP JSON、公共 provider 键盘菜单、ChatGPT 注册编辑、自定义无密钥保存、已保存工作台和模型 picker。`behavior.json` 记录页头/侧栏固定、内容独立滚动、重复打开、输入 DOM identity、离开/原生关闭草稿保护、失败保存和键盘选择结果。图像用于 revision 7 责任与交互审阅，不以像素 snapshot 作为测试契约。

固定矩阵复用 `test:zotero:compatibility:run` 与现有 UI/core 基础设施，不另建 runner。最终使用一次构建的组合入口（只导入现有 core 278/283/285/287/289 和 UI 278；兼容性 probe 自动追加）：

```sh
ZOTERO_TEST_ENTRY=/tmp/zotero-settings-final-entry/all.test.ts \
ZOTERO_AGENT_SETTINGS_UI_OUTPUT="$PWD/artifacts/pi-agent-runtime/settings-implementation/final-zotero-<major>" \
npm run test:zotero:compatibility:run -- \
  --target zotero-<major>-linux-x64 --mode behavior --suite lite --domain core \
  --gate pull-request --build-root .scaffold/settings-final --timeout-ms 300000
```

固定目标：7.0.32、9.0.6、10.0.1，保持 `tests/zotero/compatibility-matrix.json` 不变。三个 receipt 的 XPI 摘要都与上述最终候选一致，`status: passed`、清理完成。

| Target | Observed host | Combined checks | Evidence |
| --- | --- | --- | --- |
| `zotero-7-linux-x64` | 7.0.32 / `20260114201030` | 55 passed | [receipt](../../../artifacts/pi-agent-runtime/settings-implementation/final-zotero-7/receipt.json)、[screenshots/behavior](../../../artifacts/pi-agent-runtime/settings-implementation/final-zotero-7/) |
| `zotero-9-linux-x64` | 9.0.6 / `20260707150941` | 55 passed | [receipt](../../../artifacts/pi-agent-runtime/settings-implementation/final-zotero-9/receipt.json)、[screenshots/behavior](../../../artifacts/pi-agent-runtime/settings-implementation/final-zotero-9/) |
| `zotero-10-linux-x64` | 10.0.1 / `20260824184709` | 55 passed | [receipt](../../../artifacts/pi-agent-runtime/settings-implementation/final-zotero-10/receipt.json)、[screenshots/behavior](../../../artifacts/pi-agent-runtime/settings-implementation/final-zotero-10/) |

汇总：[fixed-host-results.json](../../../artifacts/pi-agent-runtime/settings-implementation/fixed-host-results.json)。构建排除数据：[bundle-development.json](../../../artifacts/pi-agent-runtime/settings-implementation/bundle-development.json)。本次语言范围与 HEAD 缺口对比：[locale-parity.json](../../../artifacts/pi-agent-runtime/settings-implementation/locale-parity.json)。

## Assistant localization follow-up

2026-10-04 按用户要求补齐全库检查发现的 Assistant 文案。英文已有的 45 个键涵盖内置 Agent 配置与本地网络授权、会话归档/删除/压缩、资源选择、用量和恢复状态；此前其他语言未完整同步。简体中文缺 41 个键，其余 9 个非英文 locale 各缺 45 个，共补充 446 条译文，保留已有翻译与产品名称。

- 全库治理检查通过：[localization-followup.log](../../../artifacts/pi-agent-runtime/settings-implementation/logs/localization-followup.log)。
- 11 语言的键集合、Fluent 语法、重复键和变量契约检查全部通过：[locale-parity-after.json](../../../artifacts/pi-agent-runtime/settings-implementation/locale-parity-after.json)。原 `locale-parity.json` 保留为修复前记录。
- `ZOTERO_BUILD_DEBUG=0 ZOTERO_PLUGIN_DIST=.scaffold/settings-localized npm run build` 通过，包含四份页面/插件 TypeScript 检查：[build-localized.log](../../../artifacts/pi-agent-runtime/settings-implementation/logs/build-localized.log)。`npm run check:help-docs` 和 `git diff --check` 通过。
- 新 XPI 为 `.scaffold/settings-localized/zotero-agents.xpi`，SHA-256 为 `4bee4e457a1e870bfe3082bdde0d2336b440a134ed515fa595adde7710bb7cce`。22 个打包语言文件的 Fluent message AST 在去除构建器添加的 addon ID 前缀后与源码一致：[candidate-localized.json](../../../artifacts/pi-agent-runtime/settings-implementation/candidate-localized.json)。

此次仅补全语言资源并更新验证记录，未重跑原生宿主矩阵。上方三个 55 passed receipt 仍绑定原 `f2f18e…` 候选；新候选保持 `dirty: true`，不作为发布验收通过证据。

## Limits and handoff

- 本地只验证 Linux x86_64；Windows/macOS 本次未执行。受控认证、来源和 UI 结果不能替代真实服务事实。
- `replace-builtin-pi-codex-auth-with-chatgpt` 的真实账户 5.2、候选绑定 5.3，以及 `verify-builtin-pi-runtime-release` 的 C20 保持未完成。本次没有发布、提交、切分支、profile reset、依赖操作或开发服务器。
- 本次配置与受控宿主检查使用 UI/core runner；不宣称执行了 full E2E 或真实服务验收。
- 全库 Assistant locale 缺口已在后续修复中清零；dirty 候选仍不能记为绿色发布证据。
- 将来同步 specs 时先同步 authentication change，再同步 settings change；本次不归档或抢占该顺序。
