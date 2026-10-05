
# src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts -->

回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。
源码：[src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts](../../../../../../../src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts)

## 符号（3）
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts:createAcpChatRuntimeReplayTarget -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts:createAcpRuntimeReplayTarget -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts:createAcpWorkflowRuntimeReplayTarget -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createAcpChatRuntimeReplayTarget | 函数 | 83–263 | 复杂 | 回放、acp-chat、目标适配 | 0 | 构造 Chat 侧回放目标：驱动连接、prompt 发送、pending 权限应答与通知消费，并在结束时清理会话。 |
| createAcpRuntimeReplayTarget | 函数 | 408–415 | 简单 | 回放、分派、目标适配 | 1 | 按 target 类型分派构造具体的回放目标，是 Chat 与 workflow 两条回放路径的统一入口。 |
| createAcpWorkflowRuntimeReplayTarget | 函数 | 265–406 | 复杂 | 回放、workflow、目标适配 | 0 | 构造 workflow 侧回放目标：驱动 skill run 的提交、权限队列处理与运行目录读取。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpRuntimeReplayIdentity.ts](acpRuntimeReplayIdentity.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts | 回放场景的身份与命名规则：构造 synthetic chat/workflow owner identity，并把 phase、sample、cadence 收敛为有长度上限的 slug 文件名段。 |
| [acpRuntimeReplayProfiler.ts](acpRuntimeReplayProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts | ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。 |
| [acpRuntimeSemanticTrace.ts](acpRuntimeSemanticTrace.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts | 语义 trace 的数据模型与 NDJSON 编解码：定义 trace schema、单调时钟、限额常量、完整性校验与解析加载，是录制端与回放端共享的格式契约。 |
| [acpSessionManager.ts](../chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunExecutionSupport.ts](../skillRun/acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunPermissionFacade.ts](../skillRun/acpSkillRunPermissionFacade.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts | ACP Skill Run 权限请求的宿主注入门面：允许外部注册并设置权限请求处理器，从而把 UI 审批回路与队列实现解耦。 |
| [acpSkillRunPermissionQueue.ts](../skillRun/acpSkillRunPermissionQueue.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts | ACP Skill Run 的权限审批队列：把 Agent 发起的 permission 请求登记为 pending 交互，支持自动批准、过期清理与用户决议回写。 |
| [acpSkillRunStore.ts](../skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunWorkspaceSelection.ts](../skillRun/acpSkillRunWorkspaceSelection.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts | ACP Skills 工作区的选中 run 管理：设置、确保与读取当前选中的 requestId。 |
| [acpSyntheticConnectionAdapter.ts](../transport/acpSyntheticConnectionAdapter.ts.md) | src/modules/acp/transport/acpSyntheticConnectionAdapter.ts | 合成 ACP 连接适配器：用固定回放的 session update 序列替代真实后端进程，供回放诊断与测试驱动完整 UI 链路。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayController.ts](acpRuntimeReplayController.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayController.ts | ACP 运行时回放控制器：管理回放任务的生命周期，负责 trace 预检、目标构造、矩阵执行与取消，并向 workspace 暴露回放状态视图。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createAcpChatRuntimeReplayTarget | 函数 | 83–263 | 构造 Chat 侧回放目标：驱动连接、prompt 发送、pending 权限应答与通知消费，并在结束时清理会话。 |
| createAcpRuntimeReplayTarget | 函数 | 408–415 | 按 target 类型分派构造具体的回放目标，是 Chat 与 workflow 两条回放路径的统一入口。 |
| createAcpWorkflowRuntimeReplayTarget | 函数 | 265–406 | 构造 workflow 侧回放目标：驱动 skill run 的提交、权限队列处理与运行目录读取。 |
