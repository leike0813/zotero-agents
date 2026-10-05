
# src/modules/acp/transport/acpConnectionAdapter.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/transport](../../../../../modules/src/modules/acp/transport.md)
<!-- node: file:src/modules/acp/transport/acpConnectionAdapter.ts -->

ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。
源码：[src/modules/acp/transport/acpConnectionAdapter.ts](../../../../../../../src/modules/acp/transport/acpConnectionAdapter.ts)

## 符号（10）
<!-- node: class:src/modules/acp/transport/acpConnectionAdapter.ts:AcpAuthRequiredError -->
<!-- node: function:src/modules/acp/transport/acpConnectionAdapter.ts:attachTransportSnapshotToError -->
<!-- node: function:src/modules/acp/transport/acpConnectionAdapter.ts:buildAcpPromptTextForTests -->
<!-- node: function:src/modules/acp/transport/acpConnectionAdapter.ts:compactText -->
<!-- node: function:src/modules/acp/transport/acpConnectionAdapter.ts:createAcpConnectionAdapter -->
<!-- node: function:src/modules/acp/transport/acpConnectionAdapter.ts:mergeAcpRuntimeTraceOwner -->
<!-- node: class:src/modules/acp/transport/acpConnectionAdapter.ts:NativeAcpConnectionAdapter -->
<!-- node: function:src/modules/acp/transport/acpConnectionAdapter.ts:normalizeAuthMethods -->
<!-- node: function:src/modules/acp/transport/acpConnectionAdapter.ts:recordAcpConnectionSemanticEvent -->
<!-- node: function:src/modules/acp/transport/acpConnectionAdapter.ts:recordAcpConnectionSessionNotification -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AcpAuthRequiredError | 类 | 266–274 | 简单 | acp、transport、utility | 0 | 表示后端要求认证的错误，携带可用认证方式供 UI 发起认证流程。 |
| attachTransportSnapshotToError | 函数 | 284–296 | 简单 | acp、transport、projection | 0 | 把 transport 快照挂到错误对象上，使 UI 能展示失败发生时的连接上下文。 |
| buildAcpPromptTextForTests | 函数 | 401–410 | 简单 | acp、transport、test | 0 | 为测试构造 prompt 文本，绕过真实 session 调用以稳定断言 prompt 形状。 |
| compactText | 函数 | 338–348 | 简单 | acp、transport、utility | 0 | 裁剪长文本为紧凑前缀，控制诊断日志与快照体积。 |
| createAcpConnectionAdapter | 函数 | 2161–2165 | 简单 | acp、transport、factory | 0 | 按后端配置创建连接适配器，选择原生实现或合成实现并完成启动阶段注入。 |
| mergeAcpRuntimeTraceOwner | 函数 | 119–130 | 简单 | acp、transport、state-management | 0 | 把 trace 归属信息合并进事件，缺失部分回落到默认 owner 标识。 |
| [NativeAcpConnectionAdapter](../../../../../symbols/src/modules/acp/transport/acpConnectionAdapter.ts/NativeAcpConnectionAdapter.md) | 类 | 442–2159 | 复杂 | acp、transport、utility | 1 | 原生 ACP 连接适配器：驱动子进程传输、session 生命周期、prompt 文本捕获、权限请求结算与诊断事件分发。 |
| normalizeAuthMethods | 函数 | 422–440 | 简单 | acp、transport、validation | 0 | 把后端上报的认证方式规整为已知集合，未知项退化为默认方式。 |
| recordAcpConnectionSemanticEvent | 函数 | 132–149 | 简单 | acp、transport、state-management | 0 | 记录一条连接层语义事件到运行时 trace，供 diagnostics 面板回放。 |
| recordAcpConnectionSessionNotification | 函数 | 151–165 | 简单 | acp、transport、state-management | 0 | 记录一条会话通知的语义事件，并附带回放所需的逻辑时间。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpClientConnection.ts](acpClientConnection.ts.md) | src/modules/acp/transport/acpClientConnection.ts | ACP 客户端连接：基于 NDJSON 传输实现 JSON-RPC 请求/响应/通知的收发、请求 ID 配对、写入排队与关闭语义。 |
| [acpDiagnostics.ts](../diagnostics/acpDiagnostics.ts.md) | src/modules/acp/diagnostics/acpDiagnostics.ts | ACP 诊断数据模型：定义证据记录结构与有界投影规则，并把任意异常序列化为脱敏、可归档的诊断载荷。 |
| [acpMessageStream.ts](acpMessageStream.ts.md) | src/modules/acp/transport/acpMessageStream.ts | ACP NDJSON 消息流：把子进程 stdout/stderr 按行切分并解析为 JSON-RPC 消息，向上提供异步迭代接口。 |
| [acpNpxLaunchCache.ts](acpNpxLaunchCache.ts.md) | src/modules/acp/transport/acpNpxLaunchCache.ts | 缓存 npx 启动 ACP 代理时解析出的可执行入口与版本信息，避免每次连接重复探测磁盘与 PATH，并通过有界等待处理启动竞态。 |
| [acpPermissionOptions.ts](acpPermissionOptions.ts.md) | src/modules/acp/transport/acpPermissionOptions.ts | ACP 权限选项语义：定义允许/拒绝等选项种类，并解析「自动批准」应对应哪个选项 ID。 |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpRuntimePerformanceProfiler.ts](../diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [acpRuntimeSemanticTrace.ts](../diagnostics/acpRuntimeSemanticTrace.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts | 语义 trace 的数据模型与 NDJSON 编解码：定义 trace schema、单调时钟、限额常量、完整性校验与解析加载，是录制端与回放端共享的格式契约。 |
| [acpRuntimeSemanticTraceRecorder.ts](../diagnostics/acpRuntimeSemanticTraceRecorder.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts | 语义 trace 录制器：独占运行时诊断模式，维护 owner/request 生命周期与限额，把 session 通知与协议事件落成可回放的 NDJSON trace，并在终态冻结与保存。 |
| [acpSessionConfigOptions.ts](../chat/acpSessionConfigOptions.ts.md) | src/modules/acp/chat/acpSessionConfigOptions.ts | ACP 会话运行时选项（mode / 模型 / 推理强度）的归一化与读模型：把后端 config options 折叠成可选列表，并推导当前选择与 reasoning 来源。 |
| [acpTransport.ts](acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [hostBridgeServer.ts](../../hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |
| [zoteroMcpProtocol.ts](../../hostBridge/mcp/zoteroMcpProtocol.ts.md) | src/modules/hostBridge/mcp/zoteroMcpProtocol.ts | Host Bridge 的 MCP 协议层：把 40 余个 capability 暴露为 JSON-RPC tool 定义，负责参数 schema 校验、权限审批请求、结果压缩与面向模型的紧凑文本渲染。 |
| [zoteroMcpServer.ts](../../hostBridge/mcp/zoteroMcpServer.ts.md) | src/modules/hostBridge/mcp/zoteroMcpServer.ts | 内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendProbe.ts](acpBackendProbe.ts.md) | src/modules/acp/transport/acpBackendProbe.ts | ACP 后端运行时能力探测：短暂连接后端以获取可用模式、模型与 MCP 配置，并把结果缓存为运行时选项。 |
| [acpBackendRefreshCacheDiagnostic.ts](../diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [acpReasoningEffortFallback.ts](../chat/acpReasoningEffortFallback.ts.md) | src/modules/acp/chat/acpReasoningEffortFallback.ts | 推理强度设置的容错层：设置 thought_level 失败时识别特定后端的 -32602 参数错误，判定为可降级而非硬失败。 |
| [acpSessionManager.ts](../chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunExecutionSupport.ts](../skillRun/acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunnerOrchestrator.ts](../skillRun/acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunRecovery.ts](../skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpSyntheticConnectionAdapter.ts](acpSyntheticConnectionAdapter.ts.md) | src/modules/acp/transport/acpSyntheticConnectionAdapter.ts | 合成 ACP 连接适配器：用固定回放的 session update 序列替代真实后端进程，供回放诊断与测试驱动完整 UI 链路。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| AcpAuthRequiredError | 类 | 266–274 | 表示后端要求认证的错误，携带可用认证方式供 UI 发起认证流程。 |
| buildAcpPromptTextForTests | 函数 | 401–410 | 为测试构造 prompt 文本，绕过真实 session 调用以稳定断言 prompt 形状。 |
| createAcpConnectionAdapter | 函数 | 2161–2165 | 按后端配置创建连接适配器，选择原生实现或合成实现并完成启动阶段注入。 |
