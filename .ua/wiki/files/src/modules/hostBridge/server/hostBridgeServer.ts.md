
# src/modules/hostBridge/server/hostBridgeServer.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server](../../../../../modules/src/modules/hostBridge/server.md)
<!-- node: file:src/modules/hostBridge/server/hostBridgeServer.ts -->

Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。
源码：[src/modules/hostBridge/server/hostBridgeServer.ts](../../../../../../../src/modules/hostBridge/server/hostBridgeServer.ts)

## 符号（33）
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:beginProfiledHostBridgeRequestRead -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:buildHostBridgeRemoteCliProfileForCopy -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:createEmptyState -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:createServerSocket -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:ensureHostBridgeServer -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:ensureSupervisorTimer -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:getHostBridgeServerStatus -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:handleHttpRequest -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:handleHttpRequestImpl -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:health -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:hostAccessRoutes -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:hostBridgeOperationRequestDigest -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:hostOperationClass -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:listen -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:manifest -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:normalizePinnedPort -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:operationReplayResponse -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:operationResponseFromRaw -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:parsePermissionScopeHeader -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:permissionErrorResponse -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:processAcceptedConnection -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:publishWellKnownProfileAfterListen -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:recordHostInputMetrics -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:requestReadErrorResponse -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:resolveHostBridgeStartConfig -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:response -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:restartHostBridgeServer -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:scheduleHostBridgeRecovery -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:shutdownHostBridgeServer -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:startHostBridgeSupervisor -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:startServer -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:stopHostBridgeSupervisor -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeServer.ts:transportContextFromAcceptedTransport -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| beginProfiledHostBridgeRequestRead | 函数 | 1234–1257 | 简单 | 性能剖析、请求读取、观测 | 0 | 以性能剖析方式启动请求体读取，产出读取阶段耗时供诊断使用。 |
| buildHostBridgeRemoteCliProfileForCopy | 函数 | 1753–1779 | 中等 | profile、cli、脱敏 | 0 | 构造可复制到远程 CLI 的 profile 内容，token 以脱敏或显式授权形态呈现。 |
| createEmptyState | 函数 | 307–335 | 简单 | 状态、server、初始化 | 0 | 创建 server 运行时状态：统计、熔断与 supervisor 计数器。 |
| createServerSocket | 函数 | 438–450 | 简单 | socket、监听、server | 0 | 创建监听 socket 并按需要固定端口。 |
| ensureHostBridgeServer | 函数 | 1659–1669 | 简单 | 启动、入口点、幂等 | 0 | 幂等启动 Host Bridge server 的公开入口。 |
| ensureSupervisorTimer | 函数 | 511–532 | 简单 | supervisor、定时器、幂等 | 0 | 确保 supervisor 定时器已启动，避免重复注册多个恢复循环。 |
| getHostBridgeServerStatus | 函数 | 1781–1826 | 中等 | 状态、对外接口、server | 1 | 返回 server 对外状态：监听地址、连接模式、supervisor 状态与统计计数。 |
| handleHttpRequest | 函数 | 1127–1176 | 中等 | 路由分发、错误处理、host-bridge | 0 | 对请求分发实现做外层包装，统一处理异常、记录指标与兜底响应。 |
| handleHttpRequestImpl | 函数 | 853–1125 | 复杂 | 路由分发、幂等、核心逻辑 | 0 | 请求分发的核心实现：读取请求、判定 operation 类别与幂等键、依次尝试各路由处理器并统一错误映射。 |
| health | 函数 | 753–762 | 简单 | 健康检查、端点、host-bridge | 0 | 提供 server 健康检查端点，返回状态与关键计数。 |
| hostAccessRoutes | 函数 | 409–427 | 简单 | 路由、访问控制、安全 | 0 | 枚举仅允许本地宿主访问的路由，未在此清单内的路由对远程请求不可见。 |
| hostBridgeOperationRequestDigest | 函数 | 534–561 | 简单 | 摘要、幂等、operation | 0 | 计算 operation 请求的语义摘要，用于幂等重放时判定请求是否等价。 |
| hostOperationClass | 函数 | 645–657 | 简单 | operation、分类、路由 | 0 | 按路由与请求判定 operation 类别（读、通用操作或 canonical mutation）。 |
| listen | 函数 | 1454–1528 | 中等 | 监听、server、启动 | 0 | 绑定端口并进入接受循环，绑定失败时按 supervisor 策略处理。 |
| manifest | 函数 | 764–828 | 中等 | manifest、脱敏、对外接口 | 0 | 生成 server manifest：声明协议版本、端点、连接模式与所需授权，token 仅以脱敏形态出现。 |
| normalizePinnedPort | 函数 | 281–291 | 简单 | 端口、配置、校验 | 0 | 归一化固定端口配置，拒绝越界或被占用的端口取值。 |
| operationReplayResponse | 函数 | 592–603 | 简单 | 幂等、重放、operation | 0 | 对重复 operation 请求返回已存响应，并标记为重放。 |
| operationResponseFromRaw | 函数 | 571–590 | 简单 | operation、响应还原、host-bridge | 0 | 把缓存的原始响应还原为结构化 Host Bridge 响应。 |
| parsePermissionScopeHeader | 函数 | 609–626 | 简单 | 请求头、scope、权限 | 0 | 解析 permission scope 请求头，缺失时降级为受限作用域。 |
| permissionErrorResponse | 函数 | 705–726 | 简单 | 错误映射、权限、响应 | 0 | 把权限错误映射为统一的 403 响应，并附带回执查询入口。 |
| processAcceptedConnection | 函数 | 1351–1444 | 复杂 | 连接处理、http、server | 0 | 处理单个已接受连接：读取请求、分发、写回响应并回收传输资源。 |
| publishWellKnownProfileAfterListen | 函数 | 1530–1554 | 简单 | profile、发布、server | 0 | 监听成功后写出 well-known profile，使 Agent 能发现端点与凭据。 |
| recordHostInputMetrics | 函数 | 1178–1217 | 中等 | 指标、观测、输入侧 | 0 | 记录 Host Bridge 输入侧指标（请求大小、读取耗时、拒绝原因）。 |
| requestReadErrorResponse | 函数 | 1263–1310 | 中等 | 请求读取、错误映射、host-bridge | 0 | 把请求读取失败映射为有界错误响应，区分超限、截断与非法帧。 |
| resolveHostBridgeStartConfig | 函数 | 337–353 | 简单 | 配置、启动、server | 0 | 解析 server 启动配置，合并首选项、测试注入与默认值。 |
| response | 函数 | 736–751 | 简单 | 响应构造、http、host-bridge | 0 | 把 Host Bridge 响应包装为 runtime HTTP 响应，统一设置头与序列化。 |
| restartHostBridgeServer | 函数 | 1686–1696 | 简单 | 重启、server、生命周期 | 0 | 重启 server，保持配置与 operation store 不变。 |
| scheduleHostBridgeRecovery | 函数 | 486–509 | 简单 | 恢复、supervisor、重试 | 0 | 在异常退出后安排有界恢复重试，避免无限快速重启。 |
| shutdownHostBridgeServer | 函数 | 1671–1684 | 简单 | 关闭、生命周期、server | 0 | 关闭 server 并停止 supervisor，清理 socket 与路由状态。 |
| startHostBridgeSupervisor | 函数 | 1698–1711 | 简单 | supervisor、恢复、server | 0 | 启动监督器，负责异常后的自动恢复。 |
| startServer | 函数 | 1556–1657 | 复杂 | 启动、server、生命周期 | 0 | 启动 server 的完整流程：状态准备、socket 创建、监听、profile 发布与 supervisor 启动。 |
| stopHostBridgeSupervisor | 函数 | 1713–1728 | 简单 | supervisor、关闭、server | 0 | 停止监督器并取消待执行的恢复重试。 |
| transportContextFromAcceptedTransport | 函数 | 683–703 | 简单 | 传输层、对端、安全 | 0 | 从已接受的连接提取传输上下文（对端主机、连接模式），供访问控制与诊断使用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimePerformanceProfiler.ts](../../acp/diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [backgroundRefreshGovernance.ts](../../backgroundRefreshGovernance.ts.md) | src/modules/backgroundRefreshGovernance.ts | 后台刷新治理：限制并发定时器数量并记录读放大诊断，防止低价值轮询在插件内失控。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [hostBridgeAuth.ts](hostBridgeAuth.ts.md) | src/modules/hostBridge/server/hostBridgeAuth.ts | Host Bridge 认证与 token 生命周期：基于持久化主密钥派生 master token，支持轮换、脱敏展示与定长比较的授权校验。 |
| [hostBridgeCapabilityContract.ts](hostBridgeCapabilityContract.ts.md) | src/modules/hostBridge/server/hostBridgeCapabilityContract.ts | Host Bridge capability 合约层：加载 `contracts/host-bridge` 的 v2 JSON Schema，为每个 capability 提供入参/出参校验与 mutation 专用校验入口。 |
| [hostBridgeCapabilityRegistry.ts](../../hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgeCapabilityRoutes.ts](routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [hostBridgeDiagnosticsRoutes.ts](routes/hostBridgeDiagnosticsRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts | Host Bridge 诊断路由：对外暴露 profile 体检、后端状态与运行选项缓存的只读视图，所有输出均做敏感字段脱敏。 |
| [hostBridgeFileRegistry.ts](hostBridgeFileRegistry.ts.md) | src/modules/hostBridge/server/hostBridgeFileRegistry.ts | Host Bridge 文件登记处：把宿主文件句柄、上传文件、工作流产物与导出结果登记为带租约的 file handle，供 Agent 下载或后续 mutation 引用。 |
| [hostBridgeFileRoutes.ts](routes/hostBridgeFileRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts | Host Bridge 文件路由：处理 Agent 的文件上传与下载，校验 file handle 租约、字节上限与内容类型，并把底层文件错误映射为统一响应。 |
| [hostBridgeNotificationInbox.ts](hostBridgeNotificationInbox.ts.md) | src/modules/hostBridge/server/hostBridgeNotificationInbox.ts | Host Bridge 通知收件箱：把 notificationHub 的工作流与 skill run 事件投影成 Agent 可读的通知事件，维护有界事件列表、确认语义与剪枝。 |
| [hostBridgeOperationStore.ts](hostBridgeOperationStore.ts.md) | src/modules/hostBridge/server/hostBridgeOperationStore.ts | Host Bridge 服务端操作存储：基于 pluginStateStore 记录 Bridge 操作的 view 与 receipt，并按任务保留策略清理过期记录。 |
| [hostBridgePagination.ts](hostBridgePagination.ts.md) | src/modules/hostBridge/server/hostBridgePagination.ts | Host Bridge 通用分页与游标实现：基于内容指纹的稳定游标解码、行分页与长文本分块，保证翻页过程中结果集不漂移。 |
| [hostBridgePermissionManager.ts](../permissions/hostBridgePermissionManager.ts.md) | src/modules/hostBridge/permissions/hostBridgePermissionManager.ts | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |
| [hostBridgeProfileStore.ts](../cli/hostBridgeProfileStore.ts.md) | src/modules/hostBridge/cli/hostBridgeProfileStore.ts | Host Bridge CLI 的 well-known profile 存储：按平台解析 profile 根目录，并把连接所需的 token、端口与主机信息写成 Agent 可发现的 profile 文件。 |
| [hostBridgeProtocol.ts](hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [hostBridgeRouteContract.ts](hostBridgeRouteContract.ts.md) | src/modules/hostBridge/server/hostBridgeRouteContract.ts | Host Bridge 路由契约的纯类型定义：声明路由 admission 类别、匹配结果形态与响应回调签名，让路由实现与 server 之间保持单向依赖。 |
| [hostBridgeSynthesisRoutes.ts](routes/hostBridgeSynthesisRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts | Host Bridge Synthesis 路由：把 sidecar 的维护状态、缓存与索引状态暴露给 Agent，并支持经审批的缓存失效操作。 |
| [hostBridgeWorkflowActivityRoutes.ts](routes/hostBridgeWorkflowActivityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts | Host Bridge 工作流与活动路由：为 Agent 提供工作流目录、校验与提交、运行与队列管理、任务与权限查询、通知确认、provider profile 维护以及 skill run 触发。 |
| [hostBridgeWorkflowAgentRunStore.ts](../workflow/hostBridgeWorkflowAgentRunStore.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts | Agent Run 持久化存储：以插件状态库记录 handoff 的生命周期状态机、租约、续期与 apply receipt，并在重启后做遗留记录恢复。 |
| [hostBridgeWorkflowControl.ts](../workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [hostBridgeWriteAutoApprovalRegistry.ts](../permissions/hostBridgeWriteAutoApprovalRegistry.ts.md) | src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts | Host Bridge 写操作的自动授权登记处：签发、吊销与按 run 回收 write auto-approval grant，并判定某个 scope 是否落在自动放权范围内。 |
| [hostHttpRequestReader.ts](hostHttpRequestReader.ts.md) | src/modules/hostBridge/server/hostHttpRequestReader.ts | 有界 HTTP 请求读取器：在 Zotero 沙箱内用 Components 流读取请求，解析 Content-Length 与分块帧，并施加大小、超时与并发上限。 |
| [index.ts](../../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [researchBundleService.ts](../workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |
| [runtimeFileTransfer.ts](../../runtimeFileTransfer.ts.md) | src/modules/runtimeFileTransfer.ts | 跨运行时文件传输层：按宿主环境选择 XPC 或 Node 兼容实现分块读取文件、计算 SHA-256 摘要并校验文件在传输期间未被改动。 |
| [runtimeHttpResponse.ts](runtimeHttpResponse.ts.md) | src/modules/hostBridge/server/runtimeHttpResponse.ts | Host Bridge HTTP 响应构造层：把 JSON、文本、空响应与文件响应统一准备成可直接写入 Zotero 输出流的字节载荷，并在内存拷贝与异步文件传输之间做统一的分块、超时与失败清理。 |
| [sha256.ts](../../../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |
| [zoteroHostCapabilityBroker.ts](../../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroLibraryPageQuery.ts](../../zoteroHost/zoteroLibraryPageQuery.ts.md) | src/modules/zoteroHost/zoteroLibraryPageQuery.ts | Zotero 库的分页查询层：把库条目、子条目、批注、分类与已保存检索统一成带签名游标的有界分页，并为每类查询提供可注入的测试 adapter。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConnectionAdapter.ts](../../acp/transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpSessionManager.ts](../../acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunExecutionSupport.ts](../../acp/skillRun/acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [assistantWorkspacePublicationHost.ts](../../assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeCliInjection.ts](../cli/hostBridgeCliInjection.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInjection.ts | 把 Host Bridge CLI 注入到 Agent 进程的环境与配置中（认证令牌、写入自动审批登记、Server 地址），使 Agent 可直接调用 CLI 暴露的宿主能力。 |
| [hostBridgeSkillRunnerEnv.ts](../cli/hostBridgeSkillRunnerEnv.ts.md) | src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts | 为 SkillRunner 后端推导 Host Bridge 运行环境：判定后端连接本地还是远程，据此拼装代理侧连接 Host Bridge 所需的环境变量。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildHostBridgeRemoteCliProfileForCopy | 函数 | 1753–1779 | 构造可复制到远程 CLI 的 profile 内容，token 以脱敏或显式授权形态呈现。 |
| ensureHostBridgeServer | 函数 | 1659–1669 | 幂等启动 Host Bridge server 的公开入口。 |
| getHostBridgeServerStatus | 函数 | 1781–1826 | 返回 server 对外状态：监听地址、连接模式、supervisor 状态与统计计数。 |
| restartHostBridgeServer | 函数 | 1686–1696 | 重启 server，保持配置与 operation store 不变。 |
| shutdownHostBridgeServer | 函数 | 1671–1684 | 关闭 server 并停止 supervisor，清理 socket 与路由状态。 |
| startHostBridgeSupervisor | 函数 | 1698–1711 | 启动监督器，负责异常后的自动恢复。 |
| stopHostBridgeSupervisor | 函数 | 1713–1728 | 停止监督器并取消待执行的恢复重试。 |
