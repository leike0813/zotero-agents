
# src/utils/wait.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/utils](../../../modules/src/utils.md)
<!-- node: file:src/utils/wait.ts -->

等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。
源码：[src/utils/wait.ts](../../../../../src/utils/wait.ts)

## 符号（5）
<!-- node: class:src/utils/wait.ts:BoundedWaitError -->
<!-- node: function:src/utils/wait.ts:createCancellationController -->
<!-- node: function:src/utils/wait.ts:waitForBoundedPromise -->
<!-- node: function:src/utils/wait.ts:waitForPromiseSettlement -->
<!-- node: function:src/utils/wait.ts:watchPromiseSettlement -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| BoundedWaitError | 类 | 81–101 | 中等 | 错误类型、超时、异步 | 0 | 有界等待超时抛出的错误类型，携带 timeoutMs 与可辨识的错误名供上层区分。 |
| createCancellationController | 函数 | 36–68 | 中等 | 异步、取消、兼容层 | 0 | 创建与宿主 AbortController 兼容的取消控制器，在缺少原生实现时退化为自实现信号。 |
| waitForBoundedPromise | 函数 | 161–180 | 简单 | 异步、超时、等待 | 0 | 为 Promise 加上超时上限，超时抛出 BoundedWaitError。 |
| waitForPromiseSettlement | 函数 | 103–159 | 中等 | 异步、等待、中止信号 | 0 | 等待 Promise 落定（resolve/reject），并可被外部信号提前打断。 |
| watchPromiseSettlement | 函数 | 182–207 | 中等 | 异步、观察、订阅 | 0 | 旁路观察 Promise 落定结果而不消费它，用于把后台任务结果转发给订阅方。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConnectionAdapter.ts](../modules/acp/transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpNpxLaunchCache.ts](../modules/acp/transport/acpNpxLaunchCache.ts.md) | src/modules/acp/transport/acpNpxLaunchCache.ts | 缓存 npx 启动 ACP 代理时解析出的可执行入口与版本信息，避免每次连接重复探测磁盘与 PATH，并通过有界等待处理启动竞态。 |
| [acpRuntimeReplayController.ts](../modules/acp/diagnostics/acpRuntimeReplayController.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayController.ts | ACP 运行时回放控制器：管理回放任务的生命周期，负责 trace 预检、目标构造、矩阵执行与取消，并向 workspace 暴露回放状态视图。 |
| [acpSessionManager.ts](../modules/acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunActions.ts](../modules/acp/skillRun/acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunnerOrchestrator.ts](../modules/acp/skillRun/acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunRecovery.ts](../modules/acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpTransport.ts](../modules/acp/transport/acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |
| [hostBridgeServer.ts](../modules/hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostHttpRequestReader.ts](../modules/hostBridge/server/hostHttpRequestReader.ts.md) | src/modules/hostBridge/server/hostHttpRequestReader.ts | 有界 HTTP 请求读取器：在 Zotero 沙箱内用 Components 流读取请求，解析 Content-Length 与分块帧，并施加大小、超时与并发上限。 |
| [runtime.ts](../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [skillRunnerConnectionGovernor.ts](../modules/skillRunner/connection/skillRunnerConnectionGovernor.ts.md) | src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts | SkillRunner 出站连接的唯一治理点：把提交、前台流、前台查询、结算、对账等连接请求分配到不同泳道并排队调度，施加并发上限、前台流池与物理连接债务记账，统一处理超时、abort 与迟到结算。 |
| [skillRunnerCtlBridge.ts](../modules/skillRunner/runtime/skillRunnerCtlBridge.ts.md) | src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts | SkillRunner 控制面桥接：与本地 Skill-Runner ctl 服务建立/维持连接，投递运行请求并流式回传事件，是旧后端兼容路径的核心。 |
| [skillRunnerRunDialog.ts](../modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerSessionSyncManager.ts](../modules/skillRunner/run/skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |
| [synthesisSidecarControlClient.ts](../modules/synthesis/sidecar/synthesisSidecarControlClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarControlClient.ts | sidecar 控制面客户端：读取 discovery、执行健康与握手探测并校验协议/能力/上限，分普通控制与生产控制两条 profile 支撑 Supervisor 生命周期判定。 |
| [synthesisSidecarRpcClient.ts](../modules/synthesis/sidecar/synthesisSidecarRpcClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts | sidecar 通用 RPC 客户端：向 `/synthesis/v1/call` 发送 capability 调用信封，实现有界响应读取、协议/传输错误分层与组合取消信号，是控制、计算、传输与工作台客户端的共同底座。 |
| [types.ts](../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [webDavSyncClient.ts](../modules/synthesis/webDavSyncClient.ts.md) | src/modules/synthesis/webDavSyncClient.ts | WebDAV 同步的默认 HTTP client：基于 Zotero 运行时能力发起请求、解析响应头，并为请求附加凭据。 |
| [zoteroMcpServer.ts](../modules/hostBridge/mcp/zoteroMcpServer.ts.md) | src/modules/hostBridge/mcp/zoteroMcpServer.ts | 内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| BoundedWaitError | 类 | 81–101 | 有界等待超时抛出的错误类型，携带 timeoutMs 与可辨识的错误名供上层区分。 |
| waitForBoundedPromise | 函数 | 161–180 | 为 Promise 加上超时上限，超时抛出 BoundedWaitError。 |
| watchPromiseSettlement | 函数 | 182–207 | 旁路观察 Promise 落定结果而不消费它，用于把后台任务结果转发给订阅方。 |
