# Pi 上游更新与本项目增量对齐评估

调研日期：2026-10-03。项目事实基线：`0c14475d`，分支 `dev-agent-harness`，调研开始时工作区干净。本轮只新增本报告，未调整依赖、实现、规格或 Git 状态。

## 结论

值得更新，但应保持本项目的 owner、Tool Gateway、持久化和 Workspace 边界。优先做匹配版本的核心依赖准入与 API 适配，吸收 provider 正确性及性能修复，并补齐运行时真正使用的模型元数据；官方 Sign in with ChatGPT 值得作为独立增量项。工具发现可继续在现有 MCP 代理上改进，codemode 适合另做可行性原型。直接迁移到 `pi-durable`、Chord 或完整 coding-agent 的成本和风险高于本轮收益。

这是基于源码和官方资料的设计判断。没有安装候选依赖、运行候选 browser bundle 或真实 Zotero 验证，因此 **`1.0.0` 尚未取得本项目准入证据**。

## 比较窗口与来源

这里有两个不同基线，不能把所有锁定版本之后的变化都称为“定稿后新增”。

- 选包于 **2026-08-30** 收敛：匹配的 `@earendil-works/pi-agent-core@0.84.4` 与 `@earendil-works/pi-ai@0.84.4`；OMP 只提供静态目录。[选包决议 #35](https://github.com/leike0813/zotero-agents/issues/35#issuecomment-5468047462)
- 完整方案于 **2026-09-05 13:05:03 UTC** 批准：20 个实施 change。[最终方案 #26](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5552013273)
- 当前两个生产依赖仍固定 `0.84.4`，模型目录固定 `@oh-my-pi/pi-catalog@18.0.11`。[package.json](../../package.json)、[项目交接](../builtin-pi-agent-runtime-handoff.md)
- 上游 canonical repository 是 `earendil-works/pi`；本轮不把 `can1357/oh-my-pi` 的 fork 更新混入 Pi 更新。
- 稳定目标是 **`v1.0.0` / `a13d35a742c6ef8462812a28fbe1d8c8b7431c32`**。npm 发布时间为 2026-10-01 19:12:18 UTC，GitHub release 为 19:20:55 UTC。[npm manifest](https://registry.npmjs.org/@earendil-works/pi-agent-core/1.0.0)、[GitHub release](https://github.com/earendil-works/pi/releases/tag/v1.0.0)
- 未发布观察点另行固定为 **`a276dabe57911253350bffb93cb7d7aff6a73261`**，比该 tag 多 25 个 commit。[固定 compare](https://github.com/earendil-works/pi/compare/a13d35a742c6ef8462812a28fbe1d8c8b7431c32...a276dabe57911253350bffb93cb7d7aff6a73261)

时间戳采用 npm registry 的 `time`，比 changelog 的日期更适合划分定稿边界。[pi-ai registry](https://registry.npmjs.org/@earendil-works/pi-ai)

| 版本 | npm 发布时间，UTC | 与定稿的关系 | 主要变化 |
| --- | --- | --- | --- |
| 0.84.4 | 08-28 22:05 | 本项目锁定版本 | 比较起点 |
| 0.85.0 | 09-04 10:13 | 定稿前已发布的差距 | provider stream/思考重放修复、utils 子路径扩展、Codex SSE 尾部终态修复 |
| 0.85.1 | 09-05 12:05 | 比最终批准早约一小时 | 新模型、长缓存参数修复 |
| 0.86.0 | 09-19 23:10 | 定稿后 | TranscriptContext、动态 system/tool 历史、缓存寿命、EventStream 性能修复 |
| 0.86.1 | 09-20 11:14 | 定稿后 | Meta provider、strict schema 与 overflow 分类修复 |
| 0.87.0 | 09-21 16:42 | 定稿后 | prepareRequest/finishTurn、canonical context、图片输入限制 |
| 0.87.1 | 09-22 19:38 | 定稿后 | 新模型、纯图片消息修复、压缩提示改进 |
| 0.99.0 | 09-29 17:17 | 定稿后 | codemode/MCP/tool search、ChatGPT 登录、模型类型统一、provider 事件观察 |
| 0.99.1 | 09-29 18:20 | 定稿后 | GPT-6.1 Sol 目录 |
| 0.99.2 | 09-30 19:25 | 定稿后 | 轻量 models 入口、strict 与 Retry-After 修复 |
| 1.0.0 | 10-01 19:12 | 定稿后 | core 移除旧实验 harness、pi-durable 首发、codemode prompt 改进、MCP OAuth 加固 |

版本事实以 [agent changelog](https://github.com/earendil-works/pi/blob/v1.0.0/packages/agent/CHANGELOG.md)、[ai changelog](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/CHANGELOG.md)、[coding-agent changelog](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/CHANGELOG.md) 和下述逐项源码为依据。

对 changelog 的 Added 分类另外核对了精确包：`0.84.4` 已导出 `api/*`、`providers/*` 和 `compat`，不能把这些写成定稿后新能力。默认 StreamFn 需要显式注入的契约也早于本项目基线，不计为 1.0 迁移项。[0.84.4 manifest](https://registry.npmjs.org/@earendil-works/pi-ai/0.84.4)、[baseline stream-fn](https://github.com/earendil-works/pi/blob/v0.84.4/packages/agent/src/stream-fn.ts)

## 核心执行与上下文

### 两处必须处理的接口变化

`0.86.0` 的 provider stream 输入从 `Context` 改为 normalized `TranscriptContext`。system prompt 和 tools 进入 transcript 的 system message；自定义 provider 从 `getCurrentSystemPrompt()` / `getCurrentTools()` 读取。高层 `Context` 输入仍有归一化路径，不能把它理解为项目必须直接持久化 SDK system message。[types.ts](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/types.ts)、[transcript.ts](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/utils/transcript.ts)

`0.87.0` 移除 `shouldStopAfterTurn`，增加 `prepareRequest`、`finishTurn` 和 `peekQueuedMessages()`。`prepareRequest` 覆盖第一次及后续请求；`finishTurn` 在 assistant/tool 结算后、`turn_end` 前执行，end/continue 决策在事件之后生效。error/aborted 也进入 hook，但仍是硬退出。[agent types](https://github.com/earendil-works/pi/blob/v1.0.0/packages/agent/src/types.ts)、[agent loop](https://github.com/earendil-works/pi/blob/v1.0.0/packages/agent/src/agent-loop.ts)

本项目的对应点：

- `piRuntime.ts` 在 `transformContext` 中生成 invocation、调用 preparation，再在 `streamFunction` 中替换完整 outbound context；这条组合可以评估用 `prepareRequest` 收敛，不能机械替换而改变 durable preparation 和 invocation-start 的先后语义。
- 同文件的 `agent.shouldStopAfterTurn` 当前根据 permission wait、ask_user、interrupt、unknown effect 和 LoopGuard 终止后续调用。升级必须迁移到 `finishTurn`，保证这些状态仍不会继续请求模型。
- 当前直接赋值 `agent.state.systemPrompt`；新版本该字段为从 system message 计算的只读 getter。这也是需要改写的实际调用点，应按新 transcript context 装配 prompt/tools。[agent state](https://github.com/earendil-works/pi/blob/v1.0.0/packages/agent/src/agent.ts)
- `piRuntime.ts` 的 `PiRuntimeProviderRequest.context` 与 `piProviderExecution.ts` 的 `ProviderStreams`、直接 `api/*` stream 调用须共同审查，尤其是工具目录来自冻结 preparation 而非临时 Agent state。

本地来源：[piRuntime.ts](../../src/modules/piRuntime.ts)、[piProviderExecution.ts](../../src/modules/piProviderExecution.ts)、[piTurnPreparation.ts](../../src/modules/piTurnPreparation.ts)。

**建议：P0，作为一次匹配版本升级的必要适配。** 保持 C02 canonical transcript 与 C06 preparation 所有权，把新 API 放在 `PiRuntime` 内部，不扩散到 Conversation、Skill Run 或 Workspace。

`1.0.0` 移除 core 的 compaction/token helpers，也直接影响 `piTurnPreparation.ts` 从 agent-core 导入的 `estimateContextTokens`。`pi-ai/utils/estimate` 提供估算入口并识别 system/tool declarations，可在现有 estimator port 内适配。两侧均返回含 `tokens` 的估算对象，不能误写成“数字变对象”；实际需要核对的是导入面、消息类型和 system/tool 计数语义。复用上游 estimator，避免新增一套 token 估算算法。[旧 core estimator](https://github.com/earendil-works/pi/blob/v0.84.4/packages/agent/src/harness/compaction/compaction.ts)、[新 ai estimator](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/utils/estimate.ts)

### Canonical context 和 append-only context edits

上游 coding-agent 现在由 `SessionManager` 决定未来模型上下文，提供 `ContextEditEntry`：可以省略或替换某项的模型可见内容，同时保留原历史；支持完整 system context transform，修复过滤消息误删工具声明、失败尝试继续进入 context 等问题。[session-manager.ts](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/src/core/session-manager.ts)、[agent-session.ts](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/src/core/agent-session.ts)

本项目已有 project-owned 分支 transcript、active leaf、非 context facts、压缩 CAS 和 invocation provenance。canonical owner 方向已经一致，无需引入另一个 SessionManager。context edit 值得在明确出现“保留可见历史但排除失败尝试/旧大结果”的需求时借鉴；它会改变持久化投影合同，应独立立项。不能靠临时过滤或分页缓存代替 durable edit，也不应让升级顺带增加一套编辑类型。[ADR 0001](../../docs/adr/0001-project-owned-pi-persistence.md)、[turn preparation spec](../../openspec/specs/pi-turn-preparation/spec.md)

## Provider 正确性、性能与模型元数据

### 优先吸收的修复

| 修复 | 版本 | 本项目价值与检查边界 |
| --- | --- | --- |
| Codex SSE 最后一项未以空行结束时仍识别 terminal | 0.85.0 | 现有 Codex SSE 路径直接相关；避免文本已出却缺终态 |
| EventStream 缓冲队列移除二次复杂度 | 0.86.0 | `PiRuntime` 直接使用该 stream；长输出及消费者暂时落后时可降低主线程负担 |
| 未知 OpenAI-compatible endpoint 不默认使用 strict schema | 0.87.0 | 自定义 endpoint 可用性；不能把网关本地 schema 校验与 provider strict 能力混为一谈 |
| OpenAI Responses 未完成 tool call 不再作为可执行调用输出 | 0.99.0 | 避免流缺字段或截断时混淆工具参数，是工具执行正确性边界 |
| Anthropic strict-prefer 对不支持的 schema 退回非 strict | 0.99.2 | 降低 JSON Schema 与 provider 能力不匹配造成的 400 |
| 无法解析的 Retry-After 日期使用退避 | 0.99.2 | 避免失败后立即重试；仍须受本项目 timeout、预算和取消限制 |

源码：[Codex SSE](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/api/openai-codex-responses.ts)、[EventStream](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/utils/event-stream.ts)、[Completions](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/api/openai-completions.ts)、[Responses replay/stream](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/api/openai-responses-shared.ts)、[Anthropic](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/api/anthropic-messages.ts)、[provider retry](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/utils/provider-retry.ts)。

另外有 reasoning signature/effort 重放、纯图片输入、overflow 分类和 cache/service-tier 计费修复。只有本项目启用的 dialect、实际模型 metadata 和传输才能获得相应收益；不能以“上游支持这个 provider”推断本项目已准入所有 provider。

新 `onProviderStreamEvent` 能观察归一化前的 provider 数据，但本项目 C18 禁止原始响应、正文、凭据和自由文本进入 audit。若未来使用，应在 provider 边界提取允许的结构性事实；不要直接把 hook 接到现有日志或页面。[观察 hook 类型](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/types.ts)、[本项目审计合同](../../docs/adr/0003-pi-observability-and-failure-contracts.md)

### 更新依赖不会自动更新本项目模型行为

上游新增 frontier models、`promptCache` 寿命、`inputLimits.images.resize`、多种 reasoning/compat metadata，并统一 chat/image/classifier 模型类型。`pi-ai/models` 入口可避免自动装入 TypeBox、完整目录和 provider SDK。[models.ts](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/models.ts)、[模型类型](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/types.ts)、[ai exports](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/package.json)

当前本项目静态模型来自 **OMP 18.0.11**；`PiCatalogModel` 和冻结 policy 只保留 context/output/input/tool 等少数字段。`modelOf()` 将 `reasoning` 降为布尔值，cost 写成全零，并且没有传递大部分 provider-specific compat、thinking map 或缓存 metadata。这意味着上游新模型、reasoning 修复和成本策略不会仅因 npm 版本变化而完整生效；全零 rates 也无法形成有意义的价格估计。此处是代码观察，不代表本轮测得了错误账单。[piModelCatalog.ts](../../src/modules/piModelCatalog.ts)、[piProviderContract.ts](../../src/shared/piProviderContract.ts)、[modelOf](../../src/modules/piProviderExecution.ts)

**建议：P1，紧随核心升级。** 先明确需要冻结和消费的 metadata，再改唯一 catalog normalization。比较更新 OMP 静态数据与使用 native Pi 静态目录的覆盖和体积，决定是否可以消除执行层与目录层版本错位；没有证据前不强行替换数据源。保持配置加载离线，账号模型发现只在登录/显式刷新时执行。未知上限、能力或价格保留未知，不填虚构默认值。

图片 resize 仅在模型/资源通路需要时扩展。`Usage` 的 token/cost 字段在两端保持一致，可作为会计对账基准；`reasoning`、`cacheWrite1h` 是基线已有的可选字段，不算本轮新增。新增的 `AssistantMessage.thinkingLevel` 与 classifier 结果 usage 则按实际需求投影。image generation 与 classifier 是新产品能力，不能混入 chat model picker 或按升级兼容性工作自动开放。

### 补查：目录已经可以独立于 Pi 程序版本发布

用户提出目录与插件版本解耦后，补查确认上游已有独立目录通路。`v1.0.0` 的发布 workflow 从模型生成器输出 JSON，单独发布到 R2；目录协议以 revision 标识数据，并按客户端 Pi 版本选择 `minimumPiVersion` 不高于客户端的目录。上游 CLI 使用 bundled seed 加远程覆盖、离线缓存、ETag revalidation 和显式强制刷新。[独立发布 workflow](https://github.com/earendil-works/pi/blob/v1.0.0/.github/workflows/publish-model-catalog.yml)、[目录协议](https://github.com/earendil-works/pi/blob/v1.0.0/scripts/model-catalog-protocol.ts)、[远程目录客户端](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/src/core/remote-catalog-provider.ts)、[用户说明](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/models.md)

2026-10-03 实际只读请求 `https://pi.dev/api/models?pi-version=1.0.0&types=chat` 返回 HTTP 200、JSON、ETag、`x-pi-model-catalog-minimum-version: 0.80.7` 及 `x-pi-model-catalog-revision`；响应约 837 KiB，包含 42 个 provider、1,601 个模型描述符。这是当次连通与载荷观察，不能证明 Zotero 宿主准入或之后的可用性。`types=chat` 在协议中选择 typed representation，并不保证服务端只返回 chat：实测同时含 chat、image 和 classifier，项目需要显式按支持的类型过滤。

因此目录解耦规划应首先评估直接消费 Pi 官方远程目录，通过本项目唯一的归一化与兼容性边界落地。是否需要项目自己的镜像或发布渠道仍是待决策项，不应先认定必须自建 feed。上游按 Pi 版本选目录也不能替代插件自身的 dialect、认证与 metadata 消费能力检查；新模型可通过数据刷新获得，新执行协议或认证能力仍依赖插件更新。同一 turn 的冻结 selection、凭据专属发现、用户 overlay 优先级、失败保留有效目录及目录撤回行为，需要在本项目合同中分别明确。

## 官方 Sign in with ChatGPT

这是本轮最值得单独评估的产品变化。Pi `0.99.0` 在 `openai` provider 上接入官方订阅登录，使用公开 `api.openai.com` Responses；原 `openai-codex` 改为 legacy。OpenAI 于 9 月 28 日发布本地开源应用接入说明，当前预览允许适用用户向本地开源工具授予计划用量权限。[Pi provider](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/providers/openai.ts)、[官方接入文章](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt)

本项目现有 C05 使用 Codex device flow、`openai-codex` 凭据与 `chatgpt.com/backend-api/codex/models`。已有加密、多账号隔离、迟到发现拒绝和授权 owner 可以复用，但新认证不是替换 endpoint 字符串即可迁移。[piOpenAICodexAuth.ts](../../src/modules/piOpenAICodexAuth.ts)、[piModelCatalog.ts](../../src/modules/piModelCatalog.ts)、[C05 交接](../builtin-pi-agent-c05-auth-handoff-2026-09-30.md)

官方合同要求按应用身份注册，以稳定 host ID 关联安装；首次用 `dynamic_agent_client`，保存回调签发的 client ID 后续复用；每次生成 state、nonce、PKCE，并验证 ID token 的签名与身份。凭据字段、刷新轮换、模型发现和账户切换均需要具体设计。[官方 sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)、[官方账号生命周期](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)

推理使用所选账号的模型列表和公开 Responses endpoint，必须 `store:false`、`stream:true`，成功以 `response.completed` 为证据。预览不支持 `max_output_tokens`、HTTP `previous_response_id`、Responses `tool_search`、hosted MCP 等一系列普通 API 字段/能力；因此普通 API key 的 payload 不能原样复用，账号上限仍要在 preparation 中作为预算事实处理。[模型与推理](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)、[预览限制](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)

**建议：P1，独立 change，与核心升级拆开验收。** 新认证变体复用现有 credential/configuration/owner 模块，替换新路径的发现与 payload 规则，给既有 Codex 配置明确的并行或用户迁移方案，不静默搬用旧 token。模型访问失败不能切到另一账号或 API key。

Pi 的登录源码直接导入 `node:crypto`、`node:http`，不能放入插件。应按官方合同使用 Zotero 可用的 WebCrypto、宿主浏览器与受控 callback 实现，单独证明跨平台可行性；`getDeviceId()` 是安装身份输入，不是设备码登录。[Pi login source](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/auth/oauth/openai-chatgpt.ts)

旧调研中“公开第三方接入合同尚无证据”的结论受到新官方资料影响，值得更新其适用判断；不能由此推断旧 Codex backend flow 已被等价授权或停用。本轮只确认新路径存在，未使用真实账号验证它在 Zotero 内的可行性。

## MCP、工具发现与 codemode

上游 `0.99.0` 新增内置 MCP、tool search、QuickJS codemode，以及 tool exposure、namespace、structured result、nested call 身份；`1.0.0` 缩减 codemode 声明和 prompt，使模型按需读取说明。MCP OAuth 同期增加 issuer 检查、逐 server 凭据和追加权限处理。[扩展工具合同](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/extensions.md)、[codemode 文档](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/codemode.md)、[MCP 文档](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/mcp.md)

本项目已有标准 MCP client 与 `mcp(action=search|describe|call)` 代理，默认不必把全部 server schema 送给模型，promoted 工具才直接声明；因此“MCP 与工具搜索”不是当前缺失的整块能力。当前 gateway 的 `batchMode: deferred` 表示执行延期，不能与模型 schema 的 deferred exposure 混为一谈。[piMcpToolSources.ts](../../src/modules/piMcpToolSources.ts)、[piToolGateway.ts](../../src/modules/piToolGateway.ts)

**建议：P2，先测量再扩展。** 优先改善现有 discovery 的结果排序、分页和 schema token 预算，比较 prompt 大小、调用次数、成功率及 UI 开销。若引入 provider-native deferred declaration，只改变预先冻结授权目录的模型投影；不能在活动 turn 中扩大可执行能力。SIWC 不支持 Responses 原生 tool_search，这条路径必须保留普通函数/本地代理方案。

codemode 对多次读取、批量查询和结果筛选有潜在价值，但单独发布的 `pi-codemode@1.0.0` 默认 host 直接依赖 `node:worker_threads`。QuickJS VM 没有 Node API 不等于它的宿主 browser-safe。要采用它，须另做 Zotero worker/WASM 可行性验证，并让每次 nested tool call 经过既有 Gateway、预算、效果 receipt 和取消/物理结算边界。[codemode host](https://github.com/earendil-works/pi/blob/v1.0.0/packages/codemode/src/runtime/host.ts)、[standalone package](https://github.com/earendil-works/pi/blob/v1.0.0/packages/codemode/package.json)

MCP OAuth 当前明确不支持，不能把上游 OAuth 修复当本项目现有漏洞。只有决定新增该认证能力时，才按正式 MCP 合同补齐元数据发现、issuer、server/account 隔离与追加 scopes；不复制 coding-agent 的 Node credential 文件实现。[本地 MCP 结果处理](../../src/modules/piMcpToolSources.ts)

## 新外围包与已有职责

| 上游变化 | 当前判断 | 本项目理由 |
| --- | --- | --- |
| 1.0 core 删除 AgentHarness、session storage、旧 durable、pico3、harness tools 等 | 接受包边界变薄 | 本项目本就仅使用低层 Agent，旧实验 API 不应成为生产 owner |
| pi-durable 首发，仍明确 Experimental | 观察，不直接迁移 | 对话、document、task 和恢复调度与 C02/C17/C19 重叠；其自动继续合同不能替代 unknown-effect 与 Workflow apply receipt |
| Chord facets/services/replicated state | 观察 | 引入新的应用组合与状态语义会触及已有 DTO、模块边界和 UI identity，不是一次 dependency update |
| pi-telemetry | 沿用现有结构性 audit | 它在 0.84.0 已存在，不是本轮新包；当前没有新增 changelog 功能，C18 已拥有单 sink、脱敏、限额和导出 |
| prompt cache warming | 暂缓 | 会主动产生额外模型调用与计费，需成本、预算、生命周期和账号权限设计；不是免费缓存优化 |
| TUI fullscreen、主题、终端剪贴板、CLI installer/Nix | 无需对齐 | Zotero 使用共享 Assistant Workspace 与自身交付流程 |
| virtual models、classifier、image generation | 独立需求驱动 | 新操作类型和模型路由不能破坏 turn 内冻结选择与 invocation 会计 |

来源：[core exports](https://github.com/earendil-works/pi/blob/v1.0.0/packages/agent/src/index.ts)、[durable README](https://github.com/earendil-works/pi/blob/v1.0.0/packages/durable/README.md)、[Chord](https://github.com/earendil-works/pi/blob/v1.0.0/packages/chord/README.md)、[telemetry changelog](https://github.com/earendil-works/pi/blob/v1.0.0/packages/telemetry/CHANGELOG.md)、[cache warming](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/settings.md#cache-warming)。本地职责：[ADR 0001](../../docs/adr/0001-project-owned-pi-persistence.md)、[ADR 0003](../../docs/adr/0003-pi-observability-and-failure-contracts.md)。

## 未发布 main：只列观察项

截至固定观察点，比 `1.0.0` 多 25 个 commit。其中对未来实施较有价值的是：

- SIWC callback 端口被另一登录占用时明确失败，避免 state mismatch。应纳入宿主 callback 的并发/占用行为评审。[eeac84c](https://github.com/earendil-works/pi/commit/eeac84ca92498ac18b6832754d01aef1d3c5f654)
- codemode 给 text/image/console 输出增加字符及项数上限，处理循环输出耗尽宿主内存。未来原型必须覆盖 VM 外的输出累积边界。[319fecb](https://github.com/earendil-works/pi/commit/319fecb89b17b7bf8a4b62734de9a6cc6ceabe49)
- Anthropic 在中途声明 inline tools、capacity error 重试及部分目录/replay 修复。[b271b0a](https://github.com/earendil-works/pi/commit/b271b0a524b29e13c0c9e748aea0d34e1597f2db)、[3874b3e](https://github.com/earendil-works/pi/commit/3874b3e98983c70fa05fa193b675d42cfcb8b9f8)

这些事实来自固定 commit/patch，不是 `1.0.0` 已交付能力。本轮不建议以 main 作为生产依赖。

## 推荐增量顺序与改动边界

1. **核心升级准入及 seam 适配（P0）**：目标匹配 `core/ai@1.0.0`；先验证精确发布包和传输 importer，再迁移 Context/finishTurn，复用现有 timeout、LoopGuard、owner callbacks。候选若失败，应依据明确阻断选择固定过渡版本或延后，不能放宽 Node guard。
2. **目录与 provider metadata（P1）**：在同一事实源中补齐模型能力、reasoning/compat 和真实可用的价格/缓存信息，明确静态目录版本选择。升级包与目录更新分别验收，避免把 catalog 新字段展示为已可执行能力。
3. **官方 ChatGPT 认证（P1）**：单独完成官方登录/凭据/账号发现/Responses payload 的方案与宿主可行性验证，再决定旧 Codex 入口迁移。它可以先于工具效率工作。
4. **工具发现与 context 效率（P2）**：先测现有代理，按证据增量改善 discovery、声明预算及必要的 context edit；codemode、classifier 和 cache warming 分开研究。

后续可能涉及的文件如下；这是范围评估，不是已批准的实现清单：

| 文件/区域 | 建议变化 |
| --- | --- |
| `package.json`、`package-lock.json` | 核心匹配精确版本，审阅 transitive dependency 与构建图 |
| `src/modules/piRuntime.ts` | provider context、prepareRequest/finishTurn、hook reset、错误/取消和批次暂停语义 |
| `src/modules/piProviderExecution.ts` | direct stream 输入归一化、metadata 传递及认证变体的 payload |
| `src/shared/piProviderContract.ts` | 最小必要的冻结 metadata 与新认证 DTO；保持项目自有合同 |
| `src/modules/piProviderConfiguration.ts`、`piModelCatalog.ts` | 版本 provenance、静态目录、按账号 discovery、离线加载 |
| `piCredentialStore.ts`、现有 auth/UI 模块 | 如选用 SIWC，扩展 issued client ID/host/account/refresh 合同 |
| `piTurnPreparation.ts` | 仅补与冻结模型能力、context 投影相关的行为 |
| `piMcpToolSources.ts`、`piToolGateway.ts` | 后续 discovery；不因同名能力重新造 MCP runtime |
| 既有 tests 与 Zotero suites | 扩展已存在的行为 fixture 和宿主验证，不增平行 runner |
| OpenSpec、ADR、交接、旧认证调研 | 落实所选增量方案及新证据；仅改相关当前合同 |

升级可减少旧 seam 的组合复杂度；同时扩展所有上游产品能力会增加概念、依赖和状态所有者。本轮建议把前者作为目标，把后者保持为独立需求。

## 验证要求与本轮局限

后续验证先复用 `240-pi-runtime`、`246-pi-api-key-provider-execution`、`247-pi-turn-preparation`、`251-pi-openai-codex-auth`、`256-pi-conversation-integration`、`270-pi-skill-run-integration`、C19 lifecycle/recovery 和 Workspace identity tests。关键是稳定行为：准备覆盖首次/续调用、等待/unknown/interrupt 后不再请求模型、工具批次结算、丢尾流与截断 tool call、取消和迟到事件、只读加载离线、凭据隔离及错误脱敏。

依赖升级按既有规定执行 browser build/Node builtin guard、确定性 provider fixtures、Zotero 7/9/10 支持矩阵、正式 XPI 及包体/性能验证。既有 `provider-env.js -> node:fs` Bun-only guard 是精确例外，不能扩成通用 shim；OAuth、Node worker、代理 SDK 的可达 import 要分别处理。[provider-env source](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/utils/provider-env.ts)

发布包的传递依赖也有明显变化：OpenAI SDK `6.40.0 -> 7.19.0`、Google SDK `1.52.0 -> 2.21.0`、代理库 `7.x -> 9.x`，TypeBox 和 Anthropic SDK 同步更新；core 则移除了旧 harness 所需的若干依赖。`api/*` 精确导入仍会加载对应 SDK，不能仅由子路径名字判断 browser 可达性。既有 `compat` 是上游暂存的旧 API 面，源码明确其删除条件，不宜作为长期适配方案。[baseline manifest](https://github.com/earendil-works/pi/blob/v0.84.4/packages/ai/package.json)、[target manifest](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/package.json)、[compat](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/src/compat.ts)

本项目 C20 当前仍是部分验证状态。依赖版本和接口变化形成新候选，旧候选 receipt 不能直接认证升级后的产物；应沿既有 C20 机制重新绑定所需证据，不另建验收体系。[当前 C20 verification](../../openspec/changes/verify-builtin-pi-runtime-release/verification.md)

本轮核查 GitHub Issues 定稿记录、npm 精确版本/时间戳、固定 tag 源码及 main commit diff，并通过 CodeGraph 核对当前项目边界。未运行构建、测试、真实登录或性能比较；codemode、SIWC callback、完整依赖图在 Zotero 上的可行性仍待后续验证。报告中的优先级与实施顺序是建议，未据此修改生产代码或依赖。
