
# src/modules/acp/transport/acpSyntheticConnectionAdapter.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/transport](../../../../../modules/src/modules/acp/transport.md)
<!-- node: file:src/modules/acp/transport/acpSyntheticConnectionAdapter.ts -->

合成 ACP 连接适配器：用固定回放的 session update 序列替代真实后端进程，供回放诊断与测试驱动完整 UI 链路。
源码：[src/modules/acp/transport/acpSyntheticConnectionAdapter.ts](../../../../../../../src/modules/acp/transport/acpSyntheticConnectionAdapter.ts)

## 符号（2）
<!-- node: function:src/modules/acp/transport/acpSyntheticConnectionAdapter.ts:createAcpSyntheticConnectionAdapter -->
<!-- node: function:src/modules/acp/transport/acpSyntheticConnectionAdapter.ts:inspectAcpSyntheticConnectionAdapterTimers -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createAcpSyntheticConnectionAdapter | 函数 | 57–207 | 中等 | acp、回放、factory | 0 | 创建合成适配器：按预设事件序列与逻辑时间回放 session update，并保持与原生适配器一致的能力面。 |
| inspectAcpSyntheticConnectionAdapterTimers | 函数 | 39–55 | 简单 | acp、回放、utility | 0 | 导出合成适配器的在途定时器快照，确保回放不会在测试结束后继续触发更新。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConnectionAdapter.ts](acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpRuntimeReplayLogicalTime.ts](../diagnostics/acpRuntimeReplayLogicalTime.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts | 回放的逻辑时间源：把原生 setTimeout 包装为可检查、可取消、可按剩余时间恢复的逻辑定时器，使回放不再依赖真实墙钟等待。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayProductionPorts.ts](../diagnostics/acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |
| [acpRuntimeReplayTargets.ts](../diagnostics/acpRuntimeReplayTargets.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts | 回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createAcpSyntheticConnectionAdapter | 函数 | 57–207 | 创建合成适配器：按预设事件序列与逻辑时间回放 session update，并保持与原生适配器一致的能力面。 |
| inspectAcpSyntheticConnectionAdapterTimers | 函数 | 39–55 | 导出合成适配器的在途定时器快照，确保回放不会在测试结束后继续触发更新。 |
