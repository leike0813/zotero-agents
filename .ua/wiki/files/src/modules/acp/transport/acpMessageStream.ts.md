
# src/modules/acp/transport/acpMessageStream.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/transport](../../../../../modules/src/modules/acp/transport.md)
<!-- node: file:src/modules/acp/transport/acpMessageStream.ts -->

ACP NDJSON 消息流：把子进程 stdout/stderr 按行切分并解析为 JSON-RPC 消息，向上提供异步迭代接口。
源码：[src/modules/acp/transport/acpMessageStream.ts](../../../../../../../src/modules/acp/transport/acpMessageStream.ts)

## 符号（2）
<!-- node: function:src/modules/acp/transport/acpMessageStream.ts:createAcpNdJsonMessageStream -->
<!-- node: function:src/modules/acp/transport/acpMessageStream.ts:createAcpStreamError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createAcpNdJsonMessageStream | 函数 | 37–206 | 中等 | acp、transport、factory | 0 | 创建 NDJSON 消息流迭代器：按块缓冲、行切分、JSON 解析并向调用方推送消息。 |
| createAcpStreamError | 函数 | 6–17 | 简单 | acp、transport、factory | 0 | 构造带阶段与原始行的流解析错误，便于诊断定位是协议错误还是进程退出。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpDiagnostics.ts](../diagnostics/acpDiagnostics.ts.md) | src/modules/acp/diagnostics/acpDiagnostics.ts | ACP 诊断数据模型：定义证据记录结构与有界投影规则，并把任意异常序列化为脱敏、可归档的诊断载荷。 |
| [acpTransport.ts](acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConnectionAdapter.ts](acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpRuntimeReplayProductionPorts.ts](../diagnostics/acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createAcpNdJsonMessageStream | 函数 | 37–206 | 创建 NDJSON 消息流迭代器：按块缓冲、行切分、JSON 解析并向调用方推送消息。 |
