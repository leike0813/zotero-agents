
# src/modules/hostBridge/mcp/zoteroMcpServer.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/mcp](../../../../../modules/src/modules/hostBridge/mcp.md)
<!-- node: file:src/modules/hostBridge/mcp/zoteroMcpServer.ts -->

内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。
源码：[src/modules/hostBridge/mcp/zoteroMcpServer.ts](../../../../../../../src/modules/hostBridge/mcp/zoteroMcpServer.ts)

## 符号（23）
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:appendMcpRuntimeLog -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:buildDescriptor -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:buildHttpResponse -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:createMcpRequestControl -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:ensureZoteroMcpServer -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:getGuardStateSnapshot -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:getRecentMcpRuntimeLogs -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:getZoteroMcpHealthSnapshot -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:getZoteroMcpServerStatus -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:handleHttpRequest -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:healthSeverityForState -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:isOriginAllowed -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:parseHttpRequestBytes -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:parseMcpScopeHeader -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:recordCircuitFailure -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:recordMcpRequest -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:redactZoteroMcpServerDescriptor -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:resolveCircuitState -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:runMcpJsonRpcWithMetrics -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:shutdownZoteroMcpServer -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:startServer -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpServer.ts:syncMcpRouteStateFromHostBridge -->
<!-- node: class:src/modules/hostBridge/mcp/zoteroMcpServer.ts:ZoteroMcpToolAdmission -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendMcpRuntimeLog | 函数 | 1166–1227 | 中等 | 诊断、日志、mcp | 0 | 向有界环形运行时日志追加 MCP 请求记录，敏感字段脱敏并限制条数。 |
| buildDescriptor | 函数 | 2206–2223 | 简单 | 描述符、mcp、host-bridge | 0 | 构造 MCP server 描述符，声明端点、传输模式与所需 scope。 |
| buildHttpResponse | 函数 | 878–900 | 简单 | http-响应、手写实现、host-bridge | 0 | 构造 HTTP 响应字节，包含状态行、头字段与 body。 |
| createMcpRequestControl | 函数 | 1616–1641 | 简单 | 并发控制、取消、mcp | 0 | 为单个 MCP 请求创建取消、超时与并发槽位控制句柄。 |
| ensureZoteroMcpServer | 函数 | 2339–2393 | 中等 | 启动、入口点、幂等、mcp | 0 | 幂等启动 MCP server 的唯一入口：已运行时直接返回，未运行时完成绑定并注入描述符。 |
| getGuardStateSnapshot | 函数 | 467–486 | 简单 | 熔断、状态快照、mcp | 0 | 返回熔断与并发闸门的状态快照，供健康检查与诊断面板读取。 |
| getRecentMcpRuntimeLogs | 函数 | 1229–1264 | 简单 | 诊断、日志、mcp | 0 | 读取最近的 MCP 运行时诊断日志，供设置面板与故障排查使用。 |
| getZoteroMcpHealthSnapshot | 函数 | 597–703 | 复杂 | 健康检查、快照、mcp | 0 | 汇总 MCP 服务健康快照：熔断状态、失败计数、并发占用与最近诊断记录。 |
| getZoteroMcpServerStatus | 函数 | 705–724 | 简单 | 状态、mcp、对外接口 | 0 | 返回 MCP server 的对外状态，含启用标记、端点与健康摘要。 |
| handleHttpRequest | 函数 | 1893–2190 | 复杂 | http-server、入口点、mcp | 0 | MCP HTTP 端点主处理：origin 校验、请求解析、JSON-RPC 分发、响应序列化与写回，异常统一降级为错误响应。 |
| healthSeverityForState | 函数 | 567–590 | 简单 | 健康检查、熔断、分级 | 0 | 把熔断状态映射为健康严重级别，决定 MCP 服务是否对外报告降级。 |
| isOriginAllowed | 函数 | 914–931 | 简单 | 安全、origin、mcp | 0 | 按允许的 origin 列表校验请求来源，拒绝非本地 Agent 的跨源调用。 |
| parseHttpRequestBytes | 函数 | 823–870 | 中等 | http-解析、协议层、手写实现 | 0 | 从原始字节解析 HTTP 请求：请求行、头部分隔符、头字段与 UTF-8 body 解码。 |
| parseMcpScopeHeader | 函数 | 41–62 | 简单 | 请求头、scope、mcp | 0 | 解析 MCP scope 请求头，得到调用方的 mutation scope 声明，缺失或非法时返回受限作用域。 |
| recordCircuitFailure | 函数 | 1481–1511 | 简单 | 熔断、失败计数、mcp | 0 | 按错误类型累计熔断失败计数，区分计入与不计入的终态错误。 |
| recordMcpRequest | 函数 | 1272–1333 | 中等 | 诊断、记录、mcp | 0 | 记录一次 MCP 请求的解析结果与 payload 摘要，形成后续响应归因的基线。 |
| redactZoteroMcpServerDescriptor | 函数 | 726–739 | 简单 | 脱敏、安全、mcp | 0 | 对 MCP 描述符中的 token 等敏感字段做脱敏。 |
| resolveCircuitState | 函数 | 1447–1471 | 简单 | 熔断、状态机、mcp | 0 | 根据失败计数与时间窗解析当前熔断状态（closed/open/half-open）。 |
| runMcpJsonRpcWithMetrics | 函数 | 1643–1891 | 复杂 | json-rpc、并发控制、指标、mcp | 0 | 在超时、并发闸门与熔断保护下执行 JSON-RPC，并记录耗时、错误类型与 admission 归因。 |
| shutdownZoteroMcpServer | 函数 | 2395–2402 | 简单 | 关闭、生命周期、mcp | 0 | 关闭 MCP server，停止接受连接并释放端点描述符。 |
| startServer | 函数 | 2280–2337 | 中等 | 监听、启动、mcp | 0 | 创建 socket、绑定 loopback 端口并开始接受连接，同时发布端点描述符。 |
| syncMcpRouteStateFromHostBridge | 函数 | 2225–2255 | 简单 | 状态同步、host-bridge、mcp | 0 | 从 Host Bridge server 同步路由启用状态，保证 MCP 与 HTTP 两条入口对外一致。 |
| ZoteroMcpToolAdmission | 类 | 302–430 | 中等 | admission、mcp、诊断 | 0 | tool 调用 admission 记录：绑定请求身份、payload 摘要与响应写回通道，用于失败归因与响应回填。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [hostBridgeAuth.ts](../server/hostBridgeAuth.ts.md) | src/modules/hostBridge/server/hostBridgeAuth.ts | Host Bridge 认证与 token 生命周期：基于持久化主密钥派生 master token，支持轮换、脱敏展示与定长比较的授权校验。 |
| [hostBridgePermissionManager.ts](../permissions/hostBridgePermissionManager.ts.md) | src/modules/hostBridge/permissions/hostBridgePermissionManager.ts | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |
| [hostBridgeProtocol.ts](../server/hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [runtimeHttpResponse.ts](../server/runtimeHttpResponse.ts.md) | src/modules/hostBridge/server/runtimeHttpResponse.ts | Host Bridge HTTP 响应构造层：把 JSON、文本、空响应与文件响应统一准备成可直接写入 Zotero 输出流的字节载荷，并在内存拷贝与异步文件传输之间做统一的分块、超时与失败清理。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |
| [zoteroMcpProtocol.ts](zoteroMcpProtocol.ts.md) | src/modules/hostBridge/mcp/zoteroMcpProtocol.ts | Host Bridge 的 MCP 协议层：把 40 余个 capability 暴露为 JSON-RPC tool 定义，负责参数 schema 校验、权限审批请求、结果压缩与面向模型的紧凑文本渲染。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConnectionAdapter.ts](../../acp/transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpSessionManager.ts](../../acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunExecutionSupport.ts](../../acp/skillRun/acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ensureZoteroMcpServer | 函数 | 2339–2393 | 幂等启动 MCP server 的唯一入口：已运行时直接返回，未运行时完成绑定并注入描述符。 |
| getZoteroMcpHealthSnapshot | 函数 | 597–703 | 汇总 MCP 服务健康快照：熔断状态、失败计数、并发占用与最近诊断记录。 |
| getZoteroMcpServerStatus | 函数 | 705–724 | 返回 MCP server 的对外状态，含启用标记、端点与健康摘要。 |
| redactZoteroMcpServerDescriptor | 函数 | 726–739 | 对 MCP 描述符中的 token 等敏感字段做脱敏。 |
| shutdownZoteroMcpServer | 函数 | 2395–2402 | 关闭 MCP server，停止接受连接并释放端点描述符。 |
