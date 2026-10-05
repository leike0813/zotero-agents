
# src/modules/acp/skillRun
> 目录聚合页：41 个文件、295 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/acp/skillRun/acpAgentFamilyResolver.ts](../../../../files/src/modules/acp/skillRun/acpAgentFamilyResolver.ts.md) | 文件 | 6 | agent family 解析器：按后端类型与命令特征判定当前 Agent 所属家族，为 skill run 提供差异化的执行假设。 |
| [src/modules/acp/skillRun/acpPermissionQueue.ts](../../../../files/src/modules/acp/skillRun/acpPermissionQueue.ts.md) | 文件 | 1 | ACP 权限请求的 FIFO 队列：同一会话只暴露队首请求为 active，支持按 requestId 幂等入队、应答与整队取消。 |
| [src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts](../../../../files/src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts.md) | 文件 | 9 | Agent 运行时依赖包装器：按 agent family 探测并准备命令依赖（Node/Python 等），通过平台 subprocess 抽象执行版本与存在性检查。 |
| [src/modules/acp/skillRun/acpRuntimePromptTemplates.ts](../../../../files/src/modules/acp/skillRun/acpRuntimePromptTemplates.ts.md) | 文件 | 2 | ACP 运行时 prompt 模板管理：把内置 prompt 模板物化到 runtime 目录并提供按 key 读取/解析的能力。 |
| [src/modules/acp/skillRun/acpSharedSkillCatalog.ts](../../../../files/src/modules/acp/skillRun/acpSharedSkillCatalog.ts.md) | 文件 | 3 | ACP 共享 Skill 目录：聚合插件 Skill registry 与资源清单，生成本次会话可用的共享 Skill 列表。 |
| [src/modules/acp/skillRun/acpSkillMaterializer.ts](../../../../files/src/modules/acp/skillRun/acpSkillMaterializer.ts.md) | 文件 | 1 | Skill 物化器：把 Skill 目录（含资源清单）写入 runtime 工作区，并按 agent family 决定是否需要薄代理 Skill。 |
| [src/modules/acp/skillRun/acpSkillOutputConvergence.ts](../../../../files/src/modules/acp/skillRun/acpSkillOutputConvergence.ts.md) | 文件 | 4 | Skill 输出收敛层：在多次运行输出之间做校验与归一，判断产物是否已稳定收敛并给出终态结论。 |
| [src/modules/acp/skillRun/acpSkillOutputValidator.ts](../../../../files/src/modules/acp/skillRun/acpSkillOutputValidator.ts.md) | 文件 | 3 | Skill 输出校验器：按 schema 资产与产物 manifest 校验 skill run 输出结构，输出结构化错误而非松散字符串。 |
| [src/modules/acp/skillRun/acpSkillPatchTemplates.ts](../../../../files/src/modules/acp/skillRun/acpSkillPatchTemplates.ts.md) | 文件 | 2 | Skill Patch 模板模块：把内置 patch 模板物化到 runtime 目录，供不同 agent family 修补 SKILL.md 行为差异。 |
| [src/modules/acp/skillRun/acpSkillReferenceRewriter.ts](../../../../files/src/modules/acp/skillRun/acpSkillReferenceRewriter.ts.md) | 文件 | 2 | Skill 内容引用重写器：把 SKILL.md 等文本中的相对引用改写为物化后的绝对路径，无外部依赖。 |
| [src/modules/acp/skillRun/acpSkillResourceManifest.ts](../../../../files/src/modules/acp/skillRun/acpSkillResourceManifest.ts.md) | 文件 | 2 | Skill 资源清单：列举单个 Skill 声明的附带资源文件，供物化与校验阶段核对完整性。 |
| [src/modules/acp/skillRun/acpSkillResultFileFallback.ts](../../../../files/src/modules/acp/skillRun/acpSkillResultFileFallback.ts.md) | 文件 | 2 | Skill 结果文件回退：当 Agent 未直接给出结构化结果时，从落盘结果文件回读并按校验器语义归一。 |
| [src/modules/acp/skillRun/acpSkillRunActions.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunActions.ts.md) | 文件 | 13 | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [src/modules/acp/skillRun/acpSkillRunAuditTrail.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunAuditTrail.ts.md) | 文件 | 9 | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts.md) | 文件 | 2 | skill run controller 注册表：登记执行期与准备期 controller，维护等待用户分离计时器，并在终态时清理陈旧权限请求。 |
| [src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts.md) | 文件 | 12 | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [src/modules/acp/skillRun/acpSkillRunForeground.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunForeground.ts.md) | 文件 | 1 | 把指定 skill run 拉到前台：按执行模式选择 run、更新记录中的前台标记，并打开 Assistant Workspace 侧边栏。 |
| [src/modules/acp/skillRun/acpSkillRunHosts.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunHosts.ts.md) | 文件 | 0 | skill run store 三个协作者模块（持久化、transcript 镜像、workspace 数据面）的宿主槽位契约：只含类型定义与 configure/get 访问器，刻意不产生运行时 import。 |
| [src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts.md) | 文件 | 7 | Skill 运行交互文件管理：把用户交互请求/响应、附件与文件选择投影到 runtime 文件与 assistant 交互契约之间。 |
| [src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts.md) | 文件 | 7 | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts.md) | 文件 | 6 | Skill runner 工作区管理：创建/清理 runtime 下的运行工作目录，隔离不同 requestId 的产物。 |
| [src/modules/acp/skillRun/acpSkillRunPayloadStore.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunPayloadStore.ts.md) | 文件 | 5 | skill run 的载荷持久化：读写 run context 载荷并维护 output revision 追加日志，为产物投影与恢复提供磁盘事实源。 |
| [src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts.md) | 文件 | 2 | ACP Skill Run 权限请求的宿主注入门面：允许外部注册并设置权限请求处理器，从而把 UI 审批回路与队列实现解耦。 |
| [src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts.md) | 文件 | 7 | ACP Skill Run 的权限审批队列：把 Agent 发起的 permission 请求登记为 pending 交互，支持自动批准、过期清理与用户决议回写。 |
| [src/modules/acp/skillRun/acpSkillRunPersistence.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunPersistence.ts.md) | 文件 | 33 | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts.md) | 文件 | 5 | Skill run prompt 构建器：组合 agent family 规则、共享 Skill 目录、patch 模板与工作区上下文，生成最终运行提示词。 |
| [src/modules/acp/skillRun/acpSkillRunRecovery.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunRecovery.ts.md) | 文件 | 11 | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [src/modules/acp/skillRun/acpSkillRunRequestAdapter.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunRequestAdapter.ts.md) | 文件 | 1 | 请求适配器：把 SkillRunner 风格的 job 记录转换为统一的 ACP skill run 请求对象，屏蔽两种后端形态的差异。 |
| [src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts.md) | 文件 | 3 | ACP Skill Run 运行时目录（runtime catalog）的读写门面：保存 Agent 上报的可用模式/模型目录，并应用用户的运行时选择。 |
| [src/modules/acp/skillRun/acpSkillRunState.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunState.ts.md) | 文件 | 0 | ACP Skill Run 的进程内可变状态集合：run 记录表、控制器注册表、按 run 划分的权限队列与 runtime catalog，以及当前选中项。 |
| [src/modules/acp/skillRun/acpSkillRunStatus.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunStatus.ts.md) | 文件 | 6 | ACP Skill Run 状态机判定集合：集中回答某状态是否终态、活跃、可恢复，以及终态后能否继续对话与 prompt 失败是否可重试。 |
| [src/modules/acp/skillRun/acpSkillRunStore.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunStore.ts.md) | 文件 | 31 | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [src/modules/acp/skillRun/acpSkillRunTaskProjection.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunTaskProjection.ts.md) | 文件 | 2 | 把 ACP Skill run 摘要投影为统一的工作流任务行，使 skill run 能与普通工作流任务在同一 Dashboard/队列中呈现。 |
| [src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts.md) | 文件 | 30 | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts.md) | 文件 | 26 | ACP Skill Run transcript 的磁盘存储层：把 transcript 事件追加写入 NDJSON 日志、维护可增量重建的索引，并按页读取历史条目。 |
| [src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts.md) | 文件 | 19 | ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。 |
| [src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts](../../../../files/src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts.md) | 文件 | 2 | ACP Skills 工作区的选中 run 管理：设置、确保与读取当前选中的 requestId。 |
| [src/modules/acp/skillRun/acpSkillSchemaAssets.ts](../../../../files/src/modules/acp/skillRun/acpSkillSchemaAssets.ts.md) | 文件 | 5 | 汇集 ACP Skill 运行所需的 JSON Schema 资产（skill 输入/输出/参数/manifest），在插件沙箱内通过 runtimePersistence 读取并提供给后端做校验。 |
| [src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts](../../../../files/src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts.md) | 文件 | 5 | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |
| [src/modules/acp/skillRun/acpStartupPromptPreambles.ts](../../../../files/src/modules/acp/skillRun/acpStartupPromptPreambles.ts.md) | 文件 | 3 | ACP 会话启动提示前缀：解析内置指令文件并把宿主环境说明以可读前言形式插入首轮 prompt。 |
| [src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts](../../../../files/src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts.md) | 文件 | 5 | ACP Skill 的薄代理物化器：按 agent family 解析 skill 根目录，注入 patch 模板与参考重写，把 Skill 包物化成 Agent 可直接消费的目录结构。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](../../modules.md) | 53 |
| [src/utils](../../utils.md) | 21 |
| [src/modules/assistant/publication](../assistant/publication.md) | 16 |
| [src/modules/acp/diagnostics](diagnostics.md) | 12 |
| [src/backends](../../backends.md) | 11 |
| [src/modules/acp/transport](transport.md) | 10 |
| [src/modules/workflowExecution](../workflowExecution.md) | 9 |
| [src/config](../../config.md) | 7 |
| [src/modules/acp/chat](chat.md) | 7 |
| [src/providers](../../providers.md) | 7 |
| [src/modules/workflow/catalog](../workflow/catalog.md) | 5 |
| [src/platform](../../platform.md) | 5 |
| [src/shared](../../shared.md) | 5 |
| [src/workflows](../../workflows.md) | 5 |
| [src/jobQueue](../../jobQueue.md) | 4 |
| [src/schemas/skill](../../schemas/skill.md) | 4 |
| [.](../../../index.md) | 2 |
| [src/modules/assistant/workspace](../assistant/workspace.md) | 2 |
| [src/modules/hostBridge/cli](../hostBridge/cli.md) | 2 |
| [src/modules/hostBridge/mcp](../hostBridge/mcp.md) | 2 |
