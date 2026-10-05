
# src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts -->

skill run controller 注册表：登记执行期与准备期 controller，维护等待用户分离计时器，并在终态时清理陈旧权限请求。
源码：[src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts)

## 符号（2）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts:registerAcpSkillRunController -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts:registerAcpSkillRunSetupController -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| registerAcpSkillRunController | 函数 | 20–66 | 中等 | 注册表、controller、acp-skills | 1 | 登记执行期 controller，并按用途同步等待用户分离计时器与陈旧权限请求的清理。 |
| registerAcpSkillRunSetupController | 函数 | 79–92 | 简单 | 注册表、controller、acp-skills | 0 | 登记准备期 controller（仅创建不执行），用于 run 尚未 attach 时的中间态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunPermissionQueue.ts](acpSkillRunPermissionQueue.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts | ACP Skill Run 的权限审批队列：把 Agent 发起的 permission 请求登记为 pending 交互，支持自动批准、过期清理与用户决议回写。 |
| [acpSkillRunState.ts](acpSkillRunState.ts.md) | src/modules/acp/skillRun/acpSkillRunState.ts | ACP Skill Run 的进程内可变状态集合：run 记录表、控制器注册表、按 run 划分的权限队列与 runtime catalog，以及当前选中项。 |
| [acpSkillRunStatus.ts](acpSkillRunStatus.ts.md) | src/modules/acp/skillRun/acpSkillRunStatus.ts | ACP Skill Run 状态机判定集合：集中回答某状态是否终态、活跃、可恢复，以及终态后能否继续对话与 prompt 失败是否可重试。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunActions.ts](acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| registerAcpSkillRunController | 函数 | 20–66 | 登记执行期 controller，并按用途同步等待用户分离计时器与陈旧权限请求的清理。 |
| registerAcpSkillRunSetupController | 函数 | 79–92 | 登记准备期 controller（仅创建不执行），用于 run 尚未 attach 时的中间态。 |
