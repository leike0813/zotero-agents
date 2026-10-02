
# src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/workflow](../../../../../modules/src/modules/hostBridge/workflow.md)
<!-- node: file:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts -->

Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。
源码：[src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts](../../../../../../../src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts)

## 符号（28）
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:applyHostBridgeWorkflowAgentRun -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:buildHostBridgeWorkflowAgentRun -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:buildSkillRunsForWorkflow -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:cancelHostBridgeWorkflowRun -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:connectHostBridgeSkillRun -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:describeHostBridgeWorkflow -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:getHostBridgeSkillRun -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:getHostBridgeWorkflowControlManifest -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:getHostBridgeWorkflowDefaults -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:getHostBridgeWorkflowRunStatus -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:listHostBridgeActiveTasks -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:listHostBridgeRecentSkillRuns -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:listHostBridgeSkillRunEvents -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:listHostBridgeTasks -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:listHostBridgeWorkflowRuns -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:listHostBridgeWorkflows -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:parseHostBridgeWorkflowAgentRunRequest -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:parseHostBridgeWorkflowSubmitRequest -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:parseProviderProfile -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:parseWorkflowSelection -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:prepareHostBridgeWorkflowSubmit -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:refreshHostBridgeNotificationProjection -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:refreshHostBridgeProviderProfile -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:replyHostBridgeSkillRun -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:submitHostBridgeWorkflow -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:validateAgentApplyBundle -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:validateHostBridgeWorkflow -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:workflowStateFromSequenceStateAndSkillRuns -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyHostBridgeWorkflowAgentRun | 函数 | 1690–1940 | 复杂 | host-bridge、agent-run、apply、permission、core | 0 | 应用 Agent 回传的结果包：校验 bundle 结构、申请 apply 权限、通过 Broker 提交宿主变更并写入终态回执。 |
| buildHostBridgeWorkflowAgentRun | 函数 | 1502–1544 | 中等 | host-bridge、agent-run、handoff、core | 0 | 组装 Agent Run 交接：锁定选区、构造命名空间与准备请求，并调用 handoff 构建器产出载荷。 |
| buildSkillRunsForWorkflow | 函数 | 2985–3016 | 中等 | host-bridge、acp、projection、fallback | 1 | 把任务记录转换为 skill run 列表并在缺少 sequence step 记录时补齐兜底项。 |
| cancelHostBridgeWorkflowRun | 函数 | 3481–3524 | 中等 | host-bridge、cancellation、permission、core | 0 | 取消指定运行：解析取消权限后向对应队列单元与 skill run 下发协作式取消请求。 |
| connectHostBridgeSkillRun | 函数 | 3551–3569 | 简单 | host-bridge、acp、session、skill-run | 0 | 把代理附着到既有 skill run 会话，复用同一 transcript 通道而不新建运行。 |
| describeHostBridgeWorkflow | 函数 | 991–1070 | 中等 | host-bridge、projection、workflow、manifest | 1 | 把已加载的工作流 manifest 投影为代理可读描述，含输入输出要求、后端兼容类型与触发策略。 |
| getHostBridgeSkillRun | 函数 | 3242–3301 | 中等 | host-bridge、query、acp、skill-run | 0 | 按 id 返回单个 skill run 的完整视图，合并任务、sequence 与结果上下文。 |
| getHostBridgeWorkflowControlManifest | 函数 | 580–615 | 中等 | host-bridge、manifest、api-handler、core | 0 | 声明控制面暴露的能力集合与命令名，是外部代理发现可用操作的入口。 |
| getHostBridgeWorkflowDefaults | 函数 | 1144–1220 | 中等 | host-bridge、workflow、configuration、defaults | 0 | 返回工作流的默认执行选项与 provider profile，附带不可覆盖的安全约束。 |
| getHostBridgeWorkflowRunStatus | 函数 | 3018–3065 | 中等 | host-bridge、query、status、workflow-execution | 0 | 返回指定 run 的聚合状态：sequence 状态、关联 skill run 与 liveness 判定。 |
| listHostBridgeActiveTasks | 函数 | 3136–3194 | 中等 | host-bridge、query、tasks、monitoring | 0 | 列出当前活跃任务，供 Dashboard 与代理轮询运行状态。 |
| listHostBridgeRecentSkillRuns | 函数 | 3196–3231 | 中等 | host-bridge、query、acp、skill-run | 0 | 列出最近的 skill run 摘要，按活跃度排序供代理快速回看。 |
| listHostBridgeSkillRunEvents | 函数 | 3303–3337 | 中等 | host-bridge、query、transcript、pagination | 0 | 按游标分页列出 skill run 事件流，供 transcript 增量读取。 |
| listHostBridgeTasks | 函数 | 2645–2680 | 中等 | host-bridge、query、tasks、pagination | 0 | 按过滤条件分页列出任务，输出经过外部输入净化的任务 DTO。 |
| listHostBridgeWorkflowRuns | 函数 | 3098–3134 | 中等 | host-bridge、query、workflow-execution、pagination | 0 | 按过滤条件列出工作流运行记录，sequence 状态与 skill run 共同参与状态判定。 |
| listHostBridgeWorkflows | 函数 | 617–642 | 简单 | host-bridge、catalog、query、workflow | 0 | 列出 Harness 可见的工作流目录及其输入输出要求，供代理选择任务。 |
| parseHostBridgeWorkflowAgentRunRequest | 函数 | 948–989 | 中等 | host-bridge、parsing、validation、agent-run、core | 0 | 解析 Agent Run 交接请求，剥离外部不可信字段并保留 portable ref 与选项。 |
| parseHostBridgeWorkflowSubmitRequest | 函数 | 899–932 | 中等 | host-bridge、parsing、validation、security、core | 0 | 解析并校验工作流提交请求的外部输入，拒绝含非法路径或类型不符的载荷。 |
| parseProviderProfile | 函数 | 746–797 | 中等 | host-bridge、parsing、validation、security | 0 | 解析并校验 provider profile 键值，拒绝保留前缀等不安全取值。 |
| parseWorkflowSelection | 函数 | 799–848 | 中等 | host-bridge、selection、parsing、security、core | 0 | 把外部选区描述转换为只含 portable ref 的选择对象，不接受任何宿主原生 ID 或路径。 |
| prepareHostBridgeWorkflowSubmit | 函数 | 1311–1386 | 中等 | host-bridge、preparation、workflow、core | 1 | 提交前准备：锁定选区事实、物化输入资源、解析后端与执行选项，得到无副作用的可提交计划。 |
| refreshHostBridgeNotificationProjection | 函数 | 3339–3405 | 中等 | host-bridge、notifications、projection、core | 0 | 把通知收件箱刷新为代理可见的通知投影，标记已读并保持与 inbox 一致。 |
| refreshHostBridgeProviderProfile | 函数 | 1262–1303 | 中等 | host-bridge、configuration、refresh、provider | 0 | 刷新 provider profile 缓存并回写设置，保证代理侧看到的连接信息与插件一致。 |
| replyHostBridgeSkillRun | 函数 | 3526–3549 | 简单 | host-bridge、acp、messaging、skill-run | 0 | 向运行中的 skill run 追加用户消息，转发给后端并返回接受结果。 |
| submitHostBridgeWorkflow | 函数 | 2070–2249 | 复杂 | host-bridge、workflow、submission、orchestration、core | 0 | 工作流提交主路径：解析请求、准备资源、解析审批权限、进入提交队列并返回提交视图。 |
| validateAgentApplyBundle | 函数 | 1641–1672 | 中等 | host-bridge、validation、agent-run、security、core | 1 | 校验 Agent 提交的结果包是否符合输出契约，缺字段或越权路径直接拒绝。 |
| validateHostBridgeWorkflow | 函数 | 1072–1129 | 中等 | host-bridge、validation、workflow、core | 0 | 校验工作流是否满足 Host Bridge 准入条件（已加载、后端类型兼容、触发策略允许）。 |
| workflowStateFromSequenceStateAndSkillRuns | 函数 | 2815–2837 | 简单 | host-bridge、status、state-machine、core | 1 | 综合 sequence 状态与 skill run 状态判定工作流对外状态，避免单一来源误判。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendProbe.ts](../../acp/transport/acpBackendProbe.ts.md) | src/modules/acp/transport/acpBackendProbe.ts | ACP 后端运行时能力探测：短暂连接后端以获取可用模式、模型与 MCP 配置，并把结果缓存为运行时选项。 |
| [acpSkillRunActions.ts](../../acp/skillRun/acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunStatus.ts](../../acp/skillRun/acpSkillRunStatus.ts.md) | src/modules/acp/skillRun/acpSkillRunStatus.ts | ACP Skill Run 状态机判定集合：集中回答某状态是否终态、活跃、可恢复，以及终态后能否继续对话与 prompt 失败是否可重试。 |
| [acpSkillRunStore.ts](../../acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [backendManager.ts](../../workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [bundleIO.ts](../../workflowExecution/bundleIO.ts.md) | src/modules/workflowExecution/bundleIO.ts | 运行结果 bundle 的跨运行时 IO 封装：解析临时路径、读写字节、清理文件，并提供目录型与不可用型 BundleReader 供结果上下文读取。 |
| [dashboardActiveTasks.ts](../../dashboardActiveTasks.ts.md) | src/modules/dashboardActiveTasks.ts | Dashboard 活跃任务投影：按可见 scope 过滤 ACP skill run 与工作流任务，产出需要人工关注的任务计数。 |
| [duplicateGuardSeam.ts](../../workflowExecution/duplicateGuardSeam.ts.md) | src/modules/workflowExecution/duplicateGuardSeam.ts | 工作流重复执行守卫：比对进行中的任务摘要与待执行单元的身份（任务名、目标父条目、输入单元），识别重复后阻止提交并给出可读原因。 |
| [hostApi.ts](../../../workflows/hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [hostBridgeFileRegistry.ts](../server/hostBridgeFileRegistry.ts.md) | src/modules/hostBridge/server/hostBridgeFileRegistry.ts | Host Bridge 文件登记处：把宿主文件句柄、上传文件、工作流产物与导出结果登记为带租约的 file handle，供 Agent 下载或后续 mutation 引用。 |
| [hostBridgeNotificationInbox.ts](../server/hostBridgeNotificationInbox.ts.md) | src/modules/hostBridge/server/hostBridgeNotificationInbox.ts | Host Bridge 通知收件箱：把 notificationHub 的工作流与 skill run 事件投影成 Agent 可读的通知事件，维护有界事件列表、确认语义与剪枝。 |
| [hostBridgePermissionManager.ts](../permissions/hostBridgePermissionManager.ts.md) | src/modules/hostBridge/permissions/hostBridgePermissionManager.ts | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |
| [hostBridgeWorkflowAgentRun.ts](hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts | Host Bridge Agent Run 交接构建：把工作流请求投影为 Agent 可消费的 handoff 载荷，包含锁定的选区事实、协议指引、输出契约与 apply-back 指令。 |
| [hostBridgeWorkflowAgentRunStore.ts](hostBridgeWorkflowAgentRunStore.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts | Agent Run 持久化存储：以插件状态库记录 handoff 的生命周期状态机、租约、续期与 apply receipt，并在重启后做遗留记录恢复。 |
| [hostBridgeWorkflowResources.ts](hostBridgeWorkflowResources.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts | Host Bridge 工作流资源层：管理一次运行期间的输入输出槽位绑定、文件登记与物化，为工作流提供受约束的读写资源 API。 |
| [localization.ts](../../../workflows/localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [manifestContract.ts](../../../workflows/manifestContract.ts.md) | src/workflows/manifestContract.ts | 工作流 manifest 契约投影：把 manifest 中的执行模式、资源要求、provider 需求、结果证据与选择规则投影为可对外发布的稳定契约。 |
| [messageFormatter.ts](../../workflowExecution/messageFormatter.ts.md) | src/modules/workflowExecution/messageFormatter.ts | 工作流消息本地化格式化器：先查 addon locale 资源，缺失时回落到调用方提供的 fallback 文案，并组装出符合 WorkflowMessageFormatter 契约的格式化函数。 |
| [preparationSeam.ts](../../workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [productionExecution.ts](../../workflow/productionExecution.ts.md) | src/modules/workflow/productionExecution.ts | 工作流执行各 seam 的生产态依赖装配点，把 Host Bridge 环境构造、Assistant 侧边栏与 SkillRunner 工作区聚焦等真实实现注入 preparation/run/duplicateGuard/submission seam。 |
| [profile.ts](../../../providers/profile.ts.md) | src/providers/profile.ts | Provider Profile 层：把后端实例投影为可校验、可指纹化的 provider profile，并按 provider 运行时选项 schema 校验取值。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [requestMeta.ts](../../workflowExecution/requestMeta.ts.md) | src/modules/workflowExecution/requestMeta.ts | 从请求对象中解析目标父条目引用、任务名与输入单元身份等元信息，统一携带索引便于日志与判重使用。 |
| [resultContext.ts](../../workflowExecution/resultContext.ts.md) | src/modules/workflowExecution/resultContext.ts | 构造工作流结果上下文：按多种候选路径与命名空间前缀定位 result.json / 产物文件并读取解析，为 apply 阶段提供统一的产物访问能力。 |
| [runtime.ts](../../../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [selectionContext.ts](../../selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [sequenceStateStore.ts](../../workflowExecution/sequenceStateStore.ts.md) | src/modules/workflowExecution/sequenceStateStore.ts | 序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。 |
| [skillRunFeedback.ts](../../skillRunner/run/skillRunFeedback.ts.md) | src/modules/skillRunner/run/skillRunFeedback.ts | Skill run 反馈收集：按用户开关从运行结果与工作流产物中定位反馈文件，作为 SkillRunner 兼容性续跑的候选。 |
| [submissionSeam.ts](../../workflowExecution/submissionSeam.ts.md) | src/modules/workflowExecution/submissionSeam.ts | 工作流提交接缝：把已准备好的工作流执行单元提交到宿主任务队列或直接执行路径，并汇总每个单元的执行与回填结果。 |
| [taskDashboardHistory.ts](../../taskDashboardHistory.ts.md) | src/modules/taskDashboardHistory.ts | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [taskRuntime.ts](../../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [triggerPolicy.ts](../../../workflows/triggerPolicy.ts.md) | src/workflows/triggerPolicy.ts | 工作流触发策略：以两个纯函数表达工作流是否必须依赖当前选择集，避免 requiresSelection 判断散落各处。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowInputPlanning.ts](../../../workflows/workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |
| [workflowRuntime.ts](../../workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [workflowSettings.ts](../../workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDomain.ts](../../workflow/settings/workflowSettingsDomain.ts.md) | src/modules/workflow/settings/workflowSettingsDomain.ts | 工作流设置的领域层：定义执行选项与 Host 选项类型，负责设置记录的解析/序列化、参数按 schema 归一化、必填校验与多来源选项合并。 |
| [workflowSubmissionQueue.ts](../../../jobQueue/workflowSubmissionQueue.ts.md) | src/jobQueue/workflowSubmissionQueue.ts | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |
| [workflowSubmissionQueueContracts.ts](../../../jobQueue/workflowSubmissionQueueContracts.ts.md) | src/jobQueue/workflowSubmissionQueueContracts.ts | 工作流提交队列的类型契约：定义 branded ID、后端作用域、展示身份、槽位状态与让出/恢复原因等纯类型，不含运行时逻辑。 |
| [workflowVisibility.ts](../../workflow/catalog/workflowVisibility.ts.md) | src/modules/workflow/catalog/workflowVisibility.ts | 工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。 |
| [zipBundleReader.ts](../../../workflows/zipBundleReader.ts.md) | src/workflows/zipBundleReader.ts | zip bundle 读取：解析工作流/内容包 zip 归档，校验条目路径安全后解出文件树，并配合泄漏探针清理解包临时目录。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeNotificationInbox.ts](../server/hostBridgeNotificationInbox.ts.md) | src/modules/hostBridge/server/hostBridgeNotificationInbox.ts | Host Bridge 通知收件箱：把 notificationHub 的工作流与 skill run 事件投影成 Agent 可读的通知事件，维护有界事件列表、确认语义与剪枝。 |
| [hostBridgeServer.ts](../server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostBridgeWorkflowActivityRoutes.ts](../server/routes/hostBridgeWorkflowActivityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts | Host Bridge 工作流与活动路由：为 Agent 提供工作流目录、校验与提交、运行与队列管理、任务与权限查询、通知确认、provider profile 维护以及 skill run 触发。 |
| [hostBridgeWorkflowAgentRunStore.ts](hostBridgeWorkflowAgentRunStore.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts | Agent Run 持久化存储：以插件状态库记录 handoff 的生命周期状态机、租约、续期与 apply receipt，并在重启后做遗留记录恢复。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyHostBridgeWorkflowAgentRun | 函数 | 1690–1940 | 应用 Agent 回传的结果包：校验 bundle 结构、申请 apply 权限、通过 Broker 提交宿主变更并写入终态回执。 |
| buildHostBridgeWorkflowAgentRun | 函数 | 1502–1544 | 组装 Agent Run 交接：锁定选区、构造命名空间与准备请求，并调用 handoff 构建器产出载荷。 |
| cancelHostBridgeWorkflowRun | 函数 | 3481–3524 | 取消指定运行：解析取消权限后向对应队列单元与 skill run 下发协作式取消请求。 |
| connectHostBridgeSkillRun | 函数 | 3551–3569 | 把代理附着到既有 skill run 会话，复用同一 transcript 通道而不新建运行。 |
| describeHostBridgeWorkflow | 函数 | 991–1070 | 把已加载的工作流 manifest 投影为代理可读描述，含输入输出要求、后端兼容类型与触发策略。 |
| getHostBridgeSkillRun | 函数 | 3242–3301 | 按 id 返回单个 skill run 的完整视图，合并任务、sequence 与结果上下文。 |
| getHostBridgeWorkflowControlManifest | 函数 | 580–615 | 声明控制面暴露的能力集合与命令名，是外部代理发现可用操作的入口。 |
| getHostBridgeWorkflowDefaults | 函数 | 1144–1220 | 返回工作流的默认执行选项与 provider profile，附带不可覆盖的安全约束。 |
| getHostBridgeWorkflowRunStatus | 函数 | 3018–3065 | 返回指定 run 的聚合状态：sequence 状态、关联 skill run 与 liveness 判定。 |
| listHostBridgeActiveTasks | 函数 | 3136–3194 | 列出当前活跃任务，供 Dashboard 与代理轮询运行状态。 |
| listHostBridgeRecentSkillRuns | 函数 | 3196–3231 | 列出最近的 skill run 摘要，按活跃度排序供代理快速回看。 |
| listHostBridgeSkillRunEvents | 函数 | 3303–3337 | 按游标分页列出 skill run 事件流，供 transcript 增量读取。 |
| listHostBridgeTasks | 函数 | 2645–2680 | 按过滤条件分页列出任务，输出经过外部输入净化的任务 DTO。 |
| listHostBridgeWorkflowRuns | 函数 | 3098–3134 | 按过滤条件列出工作流运行记录，sequence 状态与 skill run 共同参与状态判定。 |
| listHostBridgeWorkflows | 函数 | 617–642 | 列出 Harness 可见的工作流目录及其输入输出要求，供代理选择任务。 |
| parseHostBridgeWorkflowAgentRunRequest | 函数 | 948–989 | 解析 Agent Run 交接请求，剥离外部不可信字段并保留 portable ref 与选项。 |
| parseHostBridgeWorkflowSubmitRequest | 函数 | 899–932 | 解析并校验工作流提交请求的外部输入，拒绝含非法路径或类型不符的载荷。 |
| prepareHostBridgeWorkflowSubmit | 函数 | 1311–1386 | 提交前准备：锁定选区事实、物化输入资源、解析后端与执行选项，得到无副作用的可提交计划。 |
| refreshHostBridgeProviderProfile | 函数 | 1262–1303 | 刷新 provider profile 缓存并回写设置，保证代理侧看到的连接信息与插件一致。 |
| replyHostBridgeSkillRun | 函数 | 3526–3549 | 向运行中的 skill run 追加用户消息，转发给后端并返回接受结果。 |
| submitHostBridgeWorkflow | 函数 | 2070–2249 | 工作流提交主路径：解析请求、准备资源、解析审批权限、进入提交队列并返回提交视图。 |
| validateHostBridgeWorkflow | 函数 | 1072–1129 | 校验工作流是否满足 Host Bridge 准入条件（已加载、后端类型兼容、触发策略允许）。 |
