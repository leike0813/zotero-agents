
# src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts -->

回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。
源码：[src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts](../../../../../../../src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts)

## 符号（4）
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts:createAcpRuntimeR2ProductionNoopPort -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts:createAcpRuntimeReplayProductionLogicalTimePort -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts:createAcpRuntimeReplayProductionProfilerPort -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts:createAcpRuntimeReplayProductionWorkspacePort -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createAcpRuntimeR2ProductionNoopPort | 函数 | 224–339 | 复杂 | 回放、no-op、副作用隔离 | 0 | 构造 R2 合成工作负载的 no-op 端口，显式记录被跳过的副作用，避免回放误写真实状态。 |
| createAcpRuntimeReplayProductionLogicalTimePort | 函数 | 48–138 | 复杂 | 回放、逻辑时间、端口 | 0 | 构造基于真实 workspace 定时器域的逻辑时间端口，把插件实际的 persist/emit 定时器纳入回放调度。 |
| createAcpRuntimeReplayProductionProfilerPort | 函数 | 140–222 | 复杂 | 回放、profiler、端口 | 0 | 构造生产 profiler 端口：绑定性能 profiler 的 metric/duration/gauge 记录能力与 replay profile 上下文。 |
| createAcpRuntimeReplayProductionWorkspacePort | 函数 | 341–521 | 复杂 | 回放、workspace、端口 | 0 | 构造 workspace 端口：打开/关闭真实侧边栏窗口、转发发布消息并等待 workspace ready。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpMessageStream.ts](../transport/acpMessageStream.ts.md) | src/modules/acp/transport/acpMessageStream.ts | ACP NDJSON 消息流：把子进程 stdout/stderr 按行切分并解析为 JSON-RPC 消息，向上提供异步迭代接口。 |
| [acpRuntimePerformanceProfiler.ts](acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [acpRuntimeReplayIdentity.ts](acpRuntimeReplayIdentity.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts | 回放场景的身份与命名规则：构造 synthetic chat/workflow owner identity，并把 phase、sample、cadence 收敛为有长度上限的 slug 文件名段。 |
| [acpRuntimeReplayLogicalTime.ts](acpRuntimeReplayLogicalTime.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts | 回放的逻辑时间源：把原生 setTimeout 包装为可检查、可取消、可按剩余时间恢复的逻辑定时器，使回放不再依赖真实墙钟等待。 |
| [acpRuntimeReplayProfileContext.ts](acpRuntimeReplayProfileContext.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfileContext.ts | 回放 profiling 上下文槽位：保存当前 requestId、来源种类与 surface，使深层性能记录无需逐层传参即可归因到正确的回放样本。 |
| [acpRuntimeReplayProfiler.ts](acpRuntimeReplayProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts | ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。 |
| [acpRuntimeReplayPublicationSidecar.ts](acpRuntimeReplayPublicationSidecar.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts | 回放的发布侧车：在独立 window 上下文里监听 Assistant Workspace 消息，跨 epoch 排空发布队列并等待 workspace 就绪，使回放期间的 UI 事件可被完整捕获与归因。 |
| [acpRuntimeSemanticTrace.ts](acpRuntimeSemanticTrace.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts | 语义 trace 的数据模型与 NDJSON 编解码：定义 trace schema、单调时钟、限额常量、完整性校验与解析加载，是录制端与回放端共享的格式契约。 |
| [acpSessionManager.ts](../chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunWorkspaceDataPlane.ts](../skillRun/acpSkillRunWorkspaceDataPlane.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts | ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。 |
| [acpSkillRunWorkspaceSelection.ts](../skillRun/acpSkillRunWorkspaceSelection.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts | ACP Skills 工作区的选中 run 管理：设置、确保与读取当前选中的 requestId。 |
| [acpSyntheticConnectionAdapter.ts](../transport/acpSyntheticConnectionAdapter.ts.md) | src/modules/acp/transport/acpSyntheticConnectionAdapter.ts | 合成 ACP 连接适配器：用固定回放的 session update 序列替代真实后端进程，供回放诊断与测试驱动完整 UI 链路。 |
| [assistantExecutionDisplayPolicy.ts](../../assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantWorkspaceSidebar.ts](../../assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [zoteroRuntimeVersion.ts](../../../shared/zoteroRuntimeVersion.ts.md) | src/shared/zoteroRuntimeVersion.ts | 把 Zotero 版本号解析为受支持的主版本（7 / 9 / 10），用于兼容性分支与诊断输出。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayController.ts](acpRuntimeReplayController.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayController.ts | ACP 运行时回放控制器：管理回放任务的生命周期，负责 trace 预检、目标构造、矩阵执行与取消，并向 workspace 暴露回放状态视图。 |
