
# src/modules/acp/skillRun/acpSkillRunActions.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunActions.ts -->

ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。
源码：[src/modules/acp/skillRun/acpSkillRunActions.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunActions.ts)

## 符号（13）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunActions.ts:archiveAcpSkillRun -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunActions.ts:cancelAcpSkillRun -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunActions.ts:connectAcpSkillRun -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunActions.ts:detachAcpSkillRunControllerAfterApplyResult -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunActions.ts:disconnectAcpSkillRun -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunActions.ts:endAcpSkillRunSession -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunActions.ts:interruptAcpSkillRunCurrentTurn -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunActions.ts:markAcpSkillRunApplyResult -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunActions.ts:replyAcpSkillRun -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunActions.ts:setAcpSkillRunMode -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunActions.ts:setAcpSkillRunModel -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunActions.ts:setAcpSkillRunReasoningEffort -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunActions.ts:shutdownAcpSkillRunConversations -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| archiveAcpSkillRun | 函数 | 214–255 | 中等 | 归档、持久化、acp-skills | 0 | 归档 skill run：先刷盘 transcript 与审计，再从可见列表移除但保留记录。 |
| cancelAcpSkillRun | 函数 | 103–169 | 中等 | 取消、acp-skills、skill-run | 0 | 取消一次 skill run：取消权限队列、通知 adapter 并把记录置为取消终态。 |
| connectAcpSkillRun | 函数 | 653–771 | 复杂 | 连接管理、acp-skills、skill-run | 0 | 连接并 attach skill run 的 ACP 会话，注册 controller 与权限队列并恢复 transcript 状态。 |
| detachAcpSkillRunControllerAfterApplyResult | 函数 | 955–980 | 中等 | 资源释放、apply 结果、acp-skills | 0 | 在 apply 结果落地后安全摘除 controller，避免执行中回调访问已释放状态。 |
| disconnectAcpSkillRun | 函数 | 773–838 | 中等 | 连接管理、acp-skills、生命周期 | 0 | 断开 skill run 的 adapter，保留记录与 transcript 以便后续重连。 |
| endAcpSkillRunSession | 函数 | 840–861 | 中等 | 会话生命周期、acp-skills、状态机 | 0 | 结束远端 ACP session 并把本地记录标记为会话已终止。 |
| interruptAcpSkillRunCurrentTurn | 函数 | 171–212 | 中等 | 中断、turn、acp-skills | 0 | 中断当前 turn 而不结束整个 run：发出 interrupt 并按 grace period 处理 adapter 强停。 |
| markAcpSkillRunApplyResult | 函数 | 982–1038 | 中等 | apply 结果、产物、acp-skills | 0 | 登记 apply 结果：写入产物投影、判断终态恢复需要，并在结果落地后完成 controller 摘除。 |
| replyAcpSkillRun | 函数 | 257–423 | 复杂 | 用户回复、acp-skills、入队 | 0 | 向等待用户输入的 run 追加用户回复：校验活跃状态、解析附件与前置引用后经 job queue 提交。 |
| setAcpSkillRunMode | 函数 | 470–502 | 中等 | 运行模式、acp-skills、状态同步 | 0 | 切换 run 的运行模式并同步持久化状态与 workspace 变更。 |
| setAcpSkillRunModel | 函数 | 504–565 | 中等 | 模型选择、acp-skills、状态同步 | 0 | 切换 run 的模型，处理 raw/display 模型差异并把不可用选项回写为本地状态。 |
| setAcpSkillRunReasoningEffort | 函数 | 567–651 | 复杂 | 推理强度、容错、acp-skills | 0 | 切换 run 的推理强度，区分 applied/unavailable/fallback 并在 fallback 时回落到模型派生值。 |
| shutdownAcpSkillRunConversations | 函数 | 1040–1100 | 复杂 | 关闭流程、刷盘、acp-skills | 0 | 关闭全部 skill run 会话：等待挂起任务、刷盘运行时文件并断开所有 adapter。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpModelOptionFolding.ts](../chat/acpModelOptionFolding.ts.md) | src/modules/acp/chat/acpModelOptionFolding.ts | ACP 模型选项折叠模块：把后端返回的扁平模型列表按 provider 与 reasoning effort 分组折叠，供聊天面板渲染并保证选中值能还原为原始 model id。 |
| [acpSkillRunControllerRegistry.ts](acpSkillRunControllerRegistry.ts.md) | src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts | skill run controller 注册表：登记执行期与准备期 controller，维护等待用户分离计时器，并在终态时清理陈旧权限请求。 |
| [acpSkillRunPersistence.ts](acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunRuntimeCatalog.ts](acpSkillRunRuntimeCatalog.ts.md) | src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts | ACP Skill Run 运行时目录（runtime catalog）的读写门面：保存 Agent 上报的可用模式/模型目录，并应用用户的运行时选择。 |
| [acpSkillRunState.ts](acpSkillRunState.ts.md) | src/modules/acp/skillRun/acpSkillRunState.ts | ACP Skill Run 的进程内可变状态集合：run 记录表、控制器注册表、按 run 划分的权限队列与 runtime catalog，以及当前选中项。 |
| [acpSkillRunStatus.ts](acpSkillRunStatus.ts.md) | src/modules/acp/skillRun/acpSkillRunStatus.ts | ACP Skill Run 状态机判定集合：集中回答某状态是否终态、活跃、可恢复，以及终态后能否继续对话与 prompt 失败是否可重试。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunTranscriptMirror.ts](acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |
| [workflowSubmissionQueue.ts](../../../jobQueue/workflowSubmissionQueue.ts.md) | src/jobQueue/workflowSubmissionQueue.ts | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSequenceStepLifecycle.ts](../../workflowExecution/acpSequenceStepLifecycle.ts.md) | src/modules/workflowExecution/acpSequenceStepLifecycle.ts | ACP 序列步骤的生命周期适配器实现，在步骤应用结果确定后把 apply 状态写回 ACP Skill Run 并在结束时卸载控制器。 |
| [acpSkillRunInteractionFiles.ts](acpSkillRunInteractionFiles.ts.md) | src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts | Skill 运行交互文件管理：把用户交互请求/响应、附件与文件选择投影到 runtime 文件与 assistant 交互契约之间。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpSkillsWorkspaceSurface.ts](acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |
| [applySeam.ts](../../workflowExecution/applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [assistantWorkspaceActionRouter.ts](../../assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [dashboardActions.ts](../../dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeWorkflowControl.ts](../../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| archiveAcpSkillRun | 函数 | 214–255 | 归档 skill run：先刷盘 transcript 与审计，再从可见列表移除但保留记录。 |
| cancelAcpSkillRun | 函数 | 103–169 | 取消一次 skill run：取消权限队列、通知 adapter 并把记录置为取消终态。 |
| connectAcpSkillRun | 函数 | 653–771 | 连接并 attach skill run 的 ACP 会话，注册 controller 与权限队列并恢复 transcript 状态。 |
| detachAcpSkillRunControllerAfterApplyResult | 函数 | 955–980 | 在 apply 结果落地后安全摘除 controller，避免执行中回调访问已释放状态。 |
| disconnectAcpSkillRun | 函数 | 773–838 | 断开 skill run 的 adapter，保留记录与 transcript 以便后续重连。 |
| endAcpSkillRunSession | 函数 | 840–861 | 结束远端 ACP session 并把本地记录标记为会话已终止。 |
| interruptAcpSkillRunCurrentTurn | 函数 | 171–212 | 中断当前 turn 而不结束整个 run：发出 interrupt 并按 grace period 处理 adapter 强停。 |
| markAcpSkillRunApplyResult | 函数 | 982–1038 | 登记 apply 结果：写入产物投影、判断终态恢复需要，并在结果落地后完成 controller 摘除。 |
| replyAcpSkillRun | 函数 | 257–423 | 向等待用户输入的 run 追加用户回复：校验活跃状态、解析附件与前置引用后经 job queue 提交。 |
| setAcpSkillRunMode | 函数 | 470–502 | 切换 run 的运行模式并同步持久化状态与 workspace 变更。 |
| setAcpSkillRunModel | 函数 | 504–565 | 切换 run 的模型，处理 raw/display 模型差异并把不可用选项回写为本地状态。 |
| setAcpSkillRunReasoningEffort | 函数 | 567–651 | 切换 run 的推理强度，区分 applied/unavailable/fallback 并在 fallback 时回落到模型派生值。 |
| shutdownAcpSkillRunConversations | 函数 | 1040–1100 | 关闭全部 skill run 会话：等待挂起任务、刷盘运行时文件并断开所有 adapter。 |
