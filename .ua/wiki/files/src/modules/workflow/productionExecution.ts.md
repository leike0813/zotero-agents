
# src/modules/workflow/productionExecution.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow](../../../../modules/src/modules/workflow.md)
<!-- node: file:src/modules/workflow/productionExecution.ts -->

工作流执行各 seam 的生产态依赖装配点，把 Host Bridge 环境构造、Assistant 侧边栏与 SkillRunner 工作区聚焦等真实实现注入 preparation/run/duplicateGuard/submission seam。
源码：[src/modules/workflow/productionExecution.ts](../../../../../../src/modules/workflow/productionExecution.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applySeam.ts](../workflowExecution/applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [assistantWorkspaceSidebar.ts](../assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [duplicateGuardSeam.ts](../workflowExecution/duplicateGuardSeam.ts.md) | src/modules/workflowExecution/duplicateGuardSeam.ts | 工作流重复执行守卫：比对进行中的任务摘要与待执行单元的身份（任务名、目标父条目、输入单元），识别重复后阻止提交并给出可读原因。 |
| [hostBridgeSkillRunnerEnv.ts](../hostBridge/cli/hostBridgeSkillRunnerEnv.ts.md) | src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts | 为 SkillRunner 后端推导 Host Bridge 运行环境：判定后端连接本地还是远程，据此拼装代理侧连接 Host Bridge 所需的环境变量。 |
| [preparationSeam.ts](../workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [runSeam.ts](../workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [runtimeLogManager.ts](../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [skillRunnerRunDialog.ts](../skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [submissionSeam.ts](../workflowExecution/submissionSeam.ts.md) | src/modules/workflowExecution/submissionSeam.ts | 工作流提交接缝：把已准备好的工作流执行单元提交到宿主任务队列或直接执行路径，并汇总每个单元的执行与回填结果。 |
| [workflowSubmissionQueue.ts](../../jobQueue/workflowSubmissionQueue.ts.md) | src/jobQueue/workflowSubmissionQueue.ts | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeWorkflowControl.ts](../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [workflowExecute.ts](ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
