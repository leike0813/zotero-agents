
# src/modules/skillRunner/run/skillRunnerRunSettlement.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunnerRunSettlement.ts -->

SkillRunner 运行的失败结算：把管理端响应与异常解析为语义化结论，按状态机规则将 run 标记为失败并停止对应的会话同步。
源码：[src/modules/skillRunner/run/skillRunnerRunSettlement.ts](../../../../../../../src/modules/skillRunner/run/skillRunnerRunSettlement.ts)

## 符号（2）
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunSettlement.ts:resolveSkillRunnerManagementResponseSemantic -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunSettlement.ts:settleSkillRunnerRunAsFailed -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| resolveSkillRunnerManagementResponseSemantic | 函数 | 68–105 | 中等 | parsing、settlement、compatibility | 1 | 从管理端响应中提取语义化状态与消息，兼容字符串布尔与嵌套字段等多种响应形态。 |
| settleSkillRunnerRunAsFailed | 函数 | 114–187 | 中等 | settlement、error-handling、skillrunner | 0 | 把指定 run 结算为失败：写入失败状态与原因、停止其会话同步并记录结算来源。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [skillRunnerProviderStateMachine.ts](skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [skillRunnerRunStore.ts](skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [skillRunnerSessionSyncManager.ts](skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardActions.ts](../../dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [manager.ts](../../../jobQueue/manager.ts.md) | src/jobQueue/manager.ts | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [skillRunnerRunDialog.ts](../surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerTaskReconciler.ts](skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolveSkillRunnerManagementResponseSemantic | 函数 | 68–105 | 从管理端响应中提取语义化状态与消息，兼容字符串布尔与嵌套字段等多种响应形态。 |
| settleSkillRunnerRunAsFailed | 函数 | 114–187 | 把指定 run 结算为失败：写入失败状态与原因、停止其会话同步并记录结算来源。 |
