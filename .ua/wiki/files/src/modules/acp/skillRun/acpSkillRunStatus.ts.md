
# src/modules/acp/skillRun/acpSkillRunStatus.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunStatus.ts -->

ACP Skill Run 状态机判定集合：集中回答某状态是否终态、活跃、可恢复，以及终态后能否继续对话与 prompt 失败是否可重试。
源码：[src/modules/acp/skillRun/acpSkillRunStatus.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunStatus.ts)

## 符号（6）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStatus.ts:isActiveAcpSkillRunStatus -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStatus.ts:isEligibleForPostTerminalAcpSkillRunConversation -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStatus.ts:isPostTerminalAcpSkillRunConversationConnected -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStatus.ts:isRecoverableAcpSkillRunStatus -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStatus.ts:isRecoverablePromptFailure -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStatus.ts:isTerminalAcpSkillRunStatus -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| isActiveAcpSkillRunStatus | 函数 | 18–26 | 简单 | acp、状态机、validation | 0 | 判定状态是否为活跃态（运行中、等待用户等），用于活跃任务计数与 UI 展示。 |
| isEligibleForPostTerminalAcpSkillRunConversation | 函数 | 51–79 | 简单 | acp、状态机、validation | 0 | 判定终态 run 是否仍可继续对话（需保留会话上下文且未被归档清理）。 |
| isPostTerminalAcpSkillRunConversationConnected | 函数 | 81–91 | 简单 | acp、状态机、validation | 0 | 判定终态后附加的对话会话当前是否仍处于连接状态。 |
| isRecoverableAcpSkillRunStatus | 函数 | 28–35 | 简单 | acp、状态机、validation | 0 | 判定状态是否允许重试或继续，用于恢复流程决定是否需要重建会话。 |
| isRecoverablePromptFailure | 函数 | 99–112 | 简单 | acp、状态机、validation | 0 | 判定 prompt 失败是否为可恢复类型（超时、中断、传输断开），以决定是否自动重试。 |
| isTerminalAcpSkillRunStatus | 函数 | 12–16 | 简单 | acp、状态机、validation | 1 | 判定状态是否为终态（成功、失败、取消等），终态不再接受自动推进。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunState.ts](acpSkillRunState.ts.md) | src/modules/acp/skillRun/acpSkillRunState.ts | ACP Skill Run 的进程内可变状态集合：run 记录表、控制器注册表、按 run 划分的权限队列与 runtime catalog，以及当前选中项。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunActions.ts](acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunControllerRegistry.ts](acpSkillRunControllerRegistry.ts.md) | src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts | skill run controller 注册表：登记执行期与准备期 controller，维护等待用户分离计时器，并在终态时清理陈旧权限请求。 |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillsWorkspaceSurface.ts](acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |
| [dashboardActiveTasks.ts](../../dashboardActiveTasks.ts.md) | src/modules/dashboardActiveTasks.ts | Dashboard 活跃任务投影：按可见 scope 过滤 ACP skill run 与工作流任务，产出需要人工关注的任务计数。 |
| [hostBridgeWorkflowControl.ts](../../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| isActiveAcpSkillRunStatus | 函数 | 18–26 | 判定状态是否为活跃态（运行中、等待用户等），用于活跃任务计数与 UI 展示。 |
| isEligibleForPostTerminalAcpSkillRunConversation | 函数 | 51–79 | 判定终态 run 是否仍可继续对话（需保留会话上下文且未被归档清理）。 |
| isPostTerminalAcpSkillRunConversationConnected | 函数 | 81–91 | 判定终态后附加的对话会话当前是否仍处于连接状态。 |
| isRecoverableAcpSkillRunStatus | 函数 | 28–35 | 判定状态是否允许重试或继续，用于恢复流程决定是否需要重建会话。 |
| isRecoverablePromptFailure | 函数 | 99–112 | 判定 prompt 失败是否为可恢复类型（超时、中断、传输断开），以决定是否自动重试。 |
| isTerminalAcpSkillRunStatus | 函数 | 12–16 | 判定状态是否为终态（成功、失败、取消等），终态不再接受自动推进。 |
