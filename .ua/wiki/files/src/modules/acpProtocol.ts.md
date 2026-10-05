
# src/modules/acpProtocol.ts
所属分层：[Agent 协议与后端运行时](../../../layers/agent-runtime.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/acpProtocol.ts -->

ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。
源码：[src/modules/acpProtocol.ts](../../../../../src/modules/acpProtocol.ts)

## 符号（4）
<!-- node: function:src/modules/acpProtocol.ts:isJsonRpcNotification -->
<!-- node: function:src/modules/acpProtocol.ts:isJsonRpcRequest -->
<!-- node: function:src/modules/acpProtocol.ts:isJsonRpcResponse -->
<!-- node: class:src/modules/acpProtocol.ts:RequestError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| isJsonRpcNotification | 函数 | 337–346 | 简单 | acp、协议、validation | 0 | 判定消息是否为 JSON-RPC 2.0 通知（有 method 无 id）。 |
| isJsonRpcRequest | 函数 | 328–335 | 简单 | acp、协议、validation | 0 | 判定消息是否为 JSON-RPC 2.0 请求（含 method 与 id）。 |
| isJsonRpcResponse | 函数 | 348–357 | 简单 | acp、协议、validation | 0 | 判定消息是否为 JSON-RPC 2.0 响应（含 id 与 result/error 之一）。 |
| RequestError | 类 | 286–326 | 简单 | acp、协议、utility | 0 | ACP 协议错误类型：封装 JSON-RPC 错误码与 data，并提供方法不存在、参数非法等标准错误构造。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpPermissionOptions.ts](acp/transport/acpPermissionOptions.ts.md) | src/modules/acp/transport/acpPermissionOptions.ts | ACP 权限选项语义：定义允许/拒绝等选项种类，并解析「自动批准」应对应哪个选项 ID。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendProbe.ts](acp/transport/acpBackendProbe.ts.md) | src/modules/acp/transport/acpBackendProbe.ts | ACP 后端运行时能力探测：短暂连接后端以获取可用模式、模型与 MCP 配置，并把结果缓存为运行时选项。 |
| [acpBackendRefreshCacheDiagnostic.ts](acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [acpClientConnection.ts](acp/transport/acpClientConnection.ts.md) | src/modules/acp/transport/acpClientConnection.ts | ACP 客户端连接：基于 NDJSON 传输实现 JSON-RPC 请求/响应/通知的收发、请求 ID 配对、写入排队与关闭语义。 |
| [acpConnectionAdapter.ts](acp/transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpConversationHostBridgePermissionRegistry.ts](hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts.md) | src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts | ACP 会话侧的 Host Bridge 权限注册表：登记权限处理器并暂存待审批的 Host Bridge 工具调用。 |
| [acpModelOptionFolding.ts](acp/chat/acpModelOptionFolding.ts.md) | src/modules/acp/chat/acpModelOptionFolding.ts | ACP 模型选项折叠模块：把后端返回的扁平模型列表按 provider 与 reasoning effort 分组折叠，供聊天面板渲染并保证选中值能还原为原始 model id。 |
| [acpPermissionQueue.ts](acp/skillRun/acpPermissionQueue.ts.md) | src/modules/acp/skillRun/acpPermissionQueue.ts | ACP 权限请求的 FIFO 队列：同一会话只暴露队首请求为 active，支持按 requestId 幂等入队、应答与整队取消。 |
| [acpReasoningEffortFallback.ts](acp/chat/acpReasoningEffortFallback.ts.md) | src/modules/acp/chat/acpReasoningEffortFallback.ts | 推理强度设置的容错层：设置 thought_level 失败时识别特定后端的 -32602 参数错误，判定为可降级而非硬失败。 |
| [acpRuntimeReplayTargets.ts](acp/diagnostics/acpRuntimeReplayTargets.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts | 回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。 |
| [acpRuntimeSemanticTraceRecorder.ts](acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts | 语义 trace 录制器：独占运行时诊断模式，维护 owner/request 生命周期与限额，把 session 通知与协议事件落成可回放的 NDJSON trace，并在终态冻结与保存。 |
| [acpSessionConfigOptions.ts](acp/chat/acpSessionConfigOptions.ts.md) | src/modules/acp/chat/acpSessionConfigOptions.ts | ACP 会话运行时选项（mode / 模型 / 推理强度）的归一化与读模型：把后端 config options 折叠成可选列表，并推导当前选择与 reasoning 来源。 |
| [acpSessionManager.ts](acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunAuditTrail.ts](acp/skillRun/acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [acpSkillRunPermissionFacade.ts](acp/skillRun/acpSkillRunPermissionFacade.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts | ACP Skill Run 权限请求的宿主注入门面：允许外部注册并设置权限请求处理器，从而把 UI 审批回路与队列实现解耦。 |
| [acpSkillRunPermissionQueue.ts](acp/skillRun/acpSkillRunPermissionQueue.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts | ACP Skill Run 的权限审批队列：把 Agent 发起的 permission 请求登记为 pending 交互，支持自动批准、过期清理与用户决议回写。 |
| [acpSkillRunStore.ts](acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunTranscriptMirror.ts](acp/skillRun/acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [acpSyntheticConnectionAdapter.ts](acp/transport/acpSyntheticConnectionAdapter.ts.md) | src/modules/acp/transport/acpSyntheticConnectionAdapter.ts | 合成 ACP 连接适配器：用固定回放的 session update 序列替代真实后端进程，供回放诊断与测试驱动完整 UI 链路。 |
| [hostBridgePermissionManager.ts](hostBridge/permissions/hostBridgePermissionManager.ts.md) | src/modules/hostBridge/permissions/hostBridgePermissionManager.ts | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |
| [skillRunnerHostBridgePermissionRegistry.ts](hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts.md) | src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts | SkillRunner 侧的 Host Bridge 权限注册表：保存待审批权限请求、发布订阅通知并支持按请求 ID 结算。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| isJsonRpcNotification | 函数 | 337–346 | 判定消息是否为 JSON-RPC 2.0 通知（有 method 无 id）。 |
| isJsonRpcRequest | 函数 | 328–335 | 判定消息是否为 JSON-RPC 2.0 请求（含 method 与 id）。 |
| isJsonRpcResponse | 函数 | 348–357 | 判定消息是否为 JSON-RPC 2.0 响应（含 id 与 result/error 之一）。 |
| RequestError | 类 | 286–326 | ACP 协议错误类型：封装 JSON-RPC 错误码与 data，并提供方法不存在、参数非法等标准错误构造。 |
