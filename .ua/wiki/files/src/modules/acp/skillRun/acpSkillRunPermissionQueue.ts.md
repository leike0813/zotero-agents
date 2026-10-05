
# src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts -->

ACP Skill Run 的权限审批队列：把 Agent 发起的 permission 请求登记为 pending 交互，支持自动批准、过期清理与用户决议回写。
源码：[src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts)

## 符号（7）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts:autoApproveAcpSkillRunPermissionRequest -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts:clearStaleAcpSkillRunPermissionRequest -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts:findStaleAcpSkillRunPermissionRequest -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts:normalizeAcpSkillRunPendingPermission -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts:normalizeAcpSkillRunPermissionRequestDetails -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts:resolveAcpSkillRunPermissionRequest -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts:setAcpSkillRunPermissionRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| autoApproveAcpSkillRunPermissionRequest | 函数 | 102–153 | 中等 | acp、权限、cache | 0 | 按权限选项的 allow 语义自动批准请求，命中即直接结算，不再等待用户交互。 |
| clearStaleAcpSkillRunPermissionRequest | 函数 | 197–239 | 简单 | acp、权限、cache | 0 | 清理所有已失效的 pending 权限，避免权限抽屉里残留无法作答的请求。 |
| findStaleAcpSkillRunPermissionRequest | 函数 | 155–195 | 简单 | acp、权限、cache | 0 | 判定某条 pending 权限是否已失去有效性（会话结束、run 终结或选项失效）。 |
| normalizeAcpSkillRunPendingPermission | 函数 | 34–52 | 简单 | acp、权限、validation | 0 | 规整 pending 权限记录，补齐时间戳、选项与工具名等字段，产出可安全持久化的形状。 |
| normalizeAcpSkillRunPermissionRequestDetails | 函数 | 20–32 | 简单 | acp、权限、validation | 0 | 把 Agent 传来的任意权限详情规整为稳定的字符串字段集合，去除非字符串与超长内容。 |
| resolveAcpSkillRunPermissionRequest | 函数 | 241–314 | 中等 | acp、权限、cache | 1 | 按用户决议结算权限请求，写回 allow/deny 选择与记忆化选项，并推进 run 状态。 |
| setAcpSkillRunPermissionRequest | 函数 | 61–98 | 简单 | acp、权限、cache | 0 | 登记一条新的 pending 权限请求并返回其 ID，同时驱动等待用户交互的 transcript 条目。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpPermissionQueue.ts](acpPermissionQueue.ts.md) | src/modules/acp/skillRun/acpPermissionQueue.ts | ACP 权限请求的 FIFO 队列：同一会话只暴露队首请求为 active，支持按 requestId 幂等入队、应答与整队取消。 |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpSkillRunPermissionFacade.ts](acpSkillRunPermissionFacade.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts | ACP Skill Run 权限请求的宿主注入门面：允许外部注册并设置权限请求处理器，从而把 UI 审批回路与队列实现解耦。 |
| [acpSkillRunPersistence.ts](acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunState.ts](acpSkillRunState.ts.md) | src/modules/acp/skillRun/acpSkillRunState.ts | ACP Skill Run 的进程内可变状态集合：run 记录表、控制器注册表、按 run 划分的权限队列与 runtime catalog，以及当前选中项。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayTargets.ts](../diagnostics/acpRuntimeReplayTargets.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts | 回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。 |
| [acpSkillRunControllerRegistry.ts](acpSkillRunControllerRegistry.ts.md) | src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts | skill run controller 注册表：登记执行期与准备期 controller，维护等待用户分离计时器，并在终态时清理陈旧权限请求。 |
| [acpSkillRunExecutionSupport.ts](acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [assistantWorkspaceActionRouter.ts](../../assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| autoApproveAcpSkillRunPermissionRequest | 函数 | 102–153 | 按权限选项的 allow 语义自动批准请求，命中即直接结算，不再等待用户交互。 |
| clearStaleAcpSkillRunPermissionRequest | 函数 | 197–239 | 清理所有已失效的 pending 权限，避免权限抽屉里残留无法作答的请求。 |
| resolveAcpSkillRunPermissionRequest | 函数 | 241–314 | 按用户决议结算权限请求，写回 allow/deny 选择与记忆化选项，并推进 run 状态。 |
| setAcpSkillRunPermissionRequest | 函数 | 61–98 | 登记一条新的 pending 权限请求并返回其 ID，同时驱动等待用户交互的 transcript 条目。 |
