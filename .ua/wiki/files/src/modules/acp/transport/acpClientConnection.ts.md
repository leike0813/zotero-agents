
# src/modules/acp/transport/acpClientConnection.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/transport](../../../../../modules/src/modules/acp/transport.md)
<!-- node: file:src/modules/acp/transport/acpClientConnection.ts -->

ACP 客户端连接：基于 NDJSON 传输实现 JSON-RPC 请求/响应/通知的收发、请求 ID 配对、写入排队与关闭语义。
源码：[src/modules/acp/transport/acpClientConnection.ts](../../../../../../../src/modules/acp/transport/acpClientConnection.ts)

## 符号（1）
<!-- node: class:src/modules/acp/transport/acpClientConnection.ts:AcpClientConnection -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AcpClientConnection | 类 | 74–449 | 复杂 | acp、transport、utility | 0 | ACP 协议客户端连接类：管理请求响应配对、通知分发、写入串行化、会话方法调用与关闭等待。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpRuntimePerformanceProfiler.ts](../diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConnectionAdapter.ts](acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| AcpClientConnection | 类 | 74–449 | ACP 协议客户端连接类：管理请求响应配对、通知分发、写入串行化、会话方法调用与关闭等待。 |
