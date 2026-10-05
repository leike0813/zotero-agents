
# src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts -->

回放的逻辑时间源：把原生 setTimeout 包装为可检查、可取消、可按剩余时间恢复的逻辑定时器，使回放不再依赖真实墙钟等待。
源码：[src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts](../../../../../../../src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts)

## 符号（1）
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts:createAcpRuntimeReplayLogicalTime -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [createAcpRuntimeReplayLogicalTime](../../../../../symbols/src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts/createAcpRuntimeReplayLogicalTime.md) | 函数 | 49–157 | 复杂 | 回放、逻辑时间、定时器 | 1 | 创建逻辑时间实例：提供定时器登记、到期推进、剩余时间恢复与全局巡检，使回放可以确定性推进各 domain 的挂起任务。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayProductionPorts.ts](acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |
| [acpRuntimeReplayProfiler.ts](acpRuntimeReplayProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts | ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。 |
| [acpSessionManager.ts](../chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunPersistence.ts](../skillRun/acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunWorkspaceDataPlane.ts](../skillRun/acpSkillRunWorkspaceDataPlane.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts | ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。 |
| [acpSyntheticConnectionAdapter.ts](../transport/acpSyntheticConnectionAdapter.ts.md) | src/modules/acp/transport/acpSyntheticConnectionAdapter.ts | 合成 ACP 连接适配器：用固定回放的 session update 序列替代真实后端进程，供回放诊断与测试驱动完整 UI 链路。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createAcpRuntimeReplayLogicalTime](../../../../../symbols/src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts/createAcpRuntimeReplayLogicalTime.md) | 函数 | 49–157 | 创建逻辑时间实例：提供定时器登记、到期推进、剩余时间恢复与全局巡检，使回放可以确定性推进各 domain 的挂起任务。 |
