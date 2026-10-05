
# src/providers/skillrunner/client.ts
所属分层：[Agent 协议与后端运行时](../../../../layers/agent-runtime.md)  
所属目录：[src/providers/skillrunner](../../../../modules/src/providers/skillrunner.md)
<!-- node: file:src/providers/skillrunner/client.ts -->

SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。

规模：1425 行
源码：[src/providers/skillrunner/client.ts](../../../../../../src/providers/skillrunner/client.ts)

## 符号（9）
<!-- node: function:src/providers/skillrunner/client.ts:collectResultJsonPathCandidates -->
<!-- node: function:src/providers/skillrunner/client.ts:createTimeoutError -->
<!-- node: function:src/providers/skillrunner/client.ts:ensureUploadRelativePath -->
<!-- node: function:src/providers/skillrunner/client.ts:mergeSkillRunnerResultResponseJson -->
<!-- node: function:src/providers/skillrunner/client.ts:normalizeBundleEntryPath -->
<!-- node: function:src/providers/skillrunner/client.ts:readJsonOrThrow -->
<!-- node: function:src/providers/skillrunner/client.ts:resolveResultJsonPath -->
<!-- node: function:src/providers/skillrunner/client.ts:resolveUploadEntriesFromRequest -->
<!-- node: class:src/providers/skillrunner/client.ts:SkillRunnerClient -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectResultJsonPathCandidates | 函数 | 182–216 | 中等 | compatibility、parsing、skillrunner | 1 | 按 SkillRunner 不同协议版本收集结果 JSON 的候选路径顺序，兼容新旧响应结构。 |
| createTimeoutError | 函数 | 117–131 | 简单 | error-handling、http-client、diagnostics | 0 | 构造带请求路径与超时毫秒数的超时错误，保证诊断信息能定位到具体步骤。 |
| [ensureUploadRelativePath](../../../../symbols/src/providers/skillrunner/client.ts/ensureUploadRelativePath.md) | 函数 | 278–305 | 中等 | security、path-handling、validation | 2 | 把本地绝对路径约束为受控的上传相对路径，阻断路径穿越并校验候选路径确实可读。 |
| mergeSkillRunnerResultResponseJson | 函数 | 261–276 | 中等 | parsing、merge、skillrunner | 0 | 合并多次结果读取得到的 JSON 片段，保证流式或多段结果最终视图完整。 |
| normalizeBundleEntryPath | 函数 | 161–170 | 简单 | normalization、utility、pure | 0 | 归一 bundle 产物条目路径，统一分隔符并去掉前导斜杠与 ./ 前缀。 |
| readJsonOrThrow | 函数 | 365–393 | 中等 | error-handling、http-client、parsing | 1 | 读取 JSON 响应体，解析失败或非 2xx 时抛出带状态码与响应摘要的错误。 |
| resolveResultJsonPath | 函数 | 232–259 | 中等 | parsing、fallback、skillrunner | 0 | 按候选路径列表从 run 响应中解析结果 JSON，全部落空时返回 undefined 而非抛错。 |
| resolveUploadEntriesFromRequest | 函数 | 313–355 | 中等 | upload、parsing、validation | 1 | 从 http.steps 请求的 files 声明解析出上传条目，跳过非法路径并给出明确错误定位。 |
| SkillRunnerClient | 类 | 395–1425 | 复杂 | provider、http-client、skillrunner、client | 0 | SkillRunner REST 客户端实现：按步骤执行 create/upload/poll/bundle/result 流程，处理交互式自动回复、连接健康上报、zip 上传与已有运行的收敛读取。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [bundleIO.ts](../../modules/workflowExecution/bundleIO.ts.md) | src/modules/workflowExecution/bundleIO.ts | 运行结果 bundle 的跨运行时 IO 封装：解析临时路径、读写字节、清理文件，并提供目录型与不可用型 BundleReader 供结果上下文读取。 |
| [contracts.ts](../contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [errors.ts](errors.ts.md) | src/providers/skillrunner/errors.ts | SkillRunner 错误类型与分类判定：定义带 HTTP 语义的 SkillRunnerHttpError 与终态运行错误，并提供认证/配置类、可恢复后端类、终态客户端错误等判定与文案格式化。 |
| [resultEnvelope.ts](../../modules/workflowExecution/resultEnvelope.ts.md) | src/modules/workflowExecution/resultEnvelope.ts | 解包 SkillRunner 返回结果的外层信封，识别带有 success_source / repair_level / artifacts 等特征字段时取出内部 data，否则按 result 嵌套逐层下探。 |
| [runtimeBridge.ts](../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimeCompatibility.ts](../../utils/runtimeCompatibility.ts.md) | src/utils/runtimeCompatibility.ts | Zotero 运行时兼容工具：提供延时与事件循环让出，以及按 specifier 探测 Gecko 模块可用性的能力探测，用于在 JS 沙箱中按宿主版本选择导入方式。 |
| [runtimeLogManager.ts](../../modules/runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistence.ts](../../modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [skillPackageBundler.ts](skillPackageBundler.ts.md) | src/providers/skillrunner/skillPackageBundler.ts | SkillRunner 侧 skill 包打包：把插件 Skill 注册表中的条目组装成 zip 包，经 zipTransport 发送给旧版 SkillRunner 后端。 |
| [skillRunnerBackendHealthRegistry.ts](../../modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [skillRunnerConnectionGovernor.ts](../../modules/skillRunner/connection/skillRunnerConnectionGovernor.ts.md) | src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts | SkillRunner 出站连接的唯一治理点：把提交、前台流、前台查询、结算、对账等连接请求分配到不同泳道并排队调度，施加并发上限、前台流池与物理连接债务记账，统一处理超时、abort 与迟到结算。 |
| [skillRunnerInteractiveAutoReply.ts](../../modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts.md) | src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts | 交互式自动回复开关模块：解析用户偏好并判定某个 run 是否应启用自动回复，同时构造对应的请求载荷。 |
| [skillRunnerProviderStateMachine.ts](../../modules/skillRunner/run/skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [types.ts](../types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |
| [zipTransport.ts](zipTransport.ts.md) | src/providers/skillrunner/zipTransport.ts | SkillRunner provider 的 zip 上传传输层：在 Zotero 沙箱内用纯 JS 构造 zip 与 multipart 负载，把 skill 包发送给旧版后端。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [provider.ts](provider.ts.md) | src/providers/skillrunner/provider.ts | SkillRunner Provider：解析后端协议能力与认证信息，声明运行时选项枚举，并把 job/sequence 请求交给 SkillRunnerClient 执行。 |
| [skillRunnerAutoReplyObserver.ts](../../modules/skillRunner/run/skillRunnerAutoReplyObserver.ts.md) | src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [skillRunnerForegroundContinuation.ts](../../modules/skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [skillRunnerTaskReconciler.ts](../../modules/skillRunner/run/skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| SkillRunnerClient | 类 | 395–1425 | SkillRunner REST 客户端实现：按步骤执行 create/upload/poll/bundle/result 流程，处理交互式自动回复、连接健康上报、zip 上传与已有运行的收敛读取。 |
