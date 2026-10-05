
# src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/workspace](../../../../../modules/src/modules/assistant/workspace.md)
<!-- node: file:src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts -->

工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。
源码：[src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts](../../../../../../../src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts)

## 符号（10）
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts:cancelQueuedWorkflowUnitForSource -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts:copyDiagnosticsForSource -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts:createSkillRunnerHostActionHandler -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts:handleAcpChatAction -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts:handleAcpSkillRunAction -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts:handleChildAction -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts:loadTranscriptPageForSource -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts:openWorkspaceForSource -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts:parseAssistantWorkspaceActionOwner -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts:resolvePermissionForSource -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| cancelQueuedWorkflowUnitForSource | 函数 | 345–367 | 简单 | router、queue、cancellation、workflow | 0 | 取消指定 owner 下排队中的工作流单元，队列与 UI 同步收敛。 |
| copyDiagnosticsForSource | 函数 | 234–257 | 简单 | router、diagnostics、clipboard、assistant | 0 | 复制指定 owner 的诊断信息到剪贴板。 |
| createSkillRunnerHostActionHandler | 函数 | 884–901 | 简单 | factory、router、skillrunner、adapter | 0 | 构造 SkillRunner 域动作处理器，绑定旧后端服务的 action 能力。 |
| handleAcpChatAction | 函数 | 861–874 | 简单 | router、acp、chat、action-dispatch | 0 | ACP Chat 域动作处理器：模型切换、取消、模式设置等操作的统一入口。 |
| handleAcpSkillRunAction | 函数 | 842–859 | 简单 | router、acp、skill-run、action-dispatch | 0 | ACP Skills 域动作处理器：审批、恢复与取消 skill run 的统一入口。 |
| handleChildAction | 函数 | 903–1098 | 复杂 | router、dispatch、orchestration、assistant | 0 | 子面板动作总入口：按 owner 分派到具体域处理器并统一错误与结果回传。 |
| loadTranscriptPageForSource | 函数 | 405–472 | 中等 | router、transcript、pagination、assistant | 0 | 按 owner 请求指定 transcript 分页，区分冷读与缓存命中路径。 |
| openWorkspaceForSource | 函数 | 259–283 | 简单 | router、navigation、owner-switch、assistant | 0 | 把指定 owner 的工作区切换为当前激活目标。 |
| parseAssistantWorkspaceActionOwner | 函数 | 126–169 | 简单 | parsing、router、owner、assistant | 0 | 解析 action 载荷中的 owner 描述，判定其归属 domain（ACP Chat / ACP Skills / SkillRunner）。 |
| resolvePermissionForSource | 函数 | 204–232 | 简单 | router、permission、dispatch、assistant | 0 | 把权限动作路由到对应 owner 的权限处理链路。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatWorkspaceSurface.ts](../../acp/chat/acpChatWorkspaceSurface.ts.md) | src/modules/acp/chat/acpChatWorkspaceSurface.ts | ACP Chat 工作区 surface adapter：把后端 conversation 变化映射为 publication kinds，并投影 transcript、toolbar、banner 等各区域的可见内容。 |
| [acpContextBuilder.ts](../../acp/chat/acpContextBuilder.ts.md) | src/modules/acp/chat/acpContextBuilder.ts | 构造随 prompt 发给 ACP Agent 的宿主上下文：当前选中条目、library 范围与 Reader 位置，统一收敛为 AcpHostContext 结构。 |
| [acpSessionManager.ts](../../acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunActions.ts](../../acp/skillRun/acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunInteractionFiles.ts](../../acp/skillRun/acpSkillRunInteractionFiles.ts.md) | src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts | Skill 运行交互文件管理：把用户交互请求/响应、附件与文件选择投影到 runtime 文件与 assistant 交互契约之间。 |
| [acpSkillRunPermissionQueue.ts](../../acp/skillRun/acpSkillRunPermissionQueue.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts | ACP Skill Run 的权限审批队列：把 Agent 发起的 permission 请求登记为 pending 交互，支持自动批准、过期清理与用户决议回写。 |
| [acpSkillRunStore.ts](../../acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunWorkspaceSelection.ts](../../acp/skillRun/acpSkillRunWorkspaceSelection.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts | ACP Skills 工作区的选中 run 管理：设置、确保与读取当前选中的 requestId。 |
| [acpSkillsWorkspaceSurface.ts](../../acp/skillRun/acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [assistantActionContract.ts](../../../shared/assistantActionContract.ts.md) | src/shared/assistantActionContract.ts | Assistant Workspace 动作负载的编译期类型镜像：描述 shell/子页面与宿主之间每个 action 各自携带的 payload 字段，由 publication 侧的 drift guard 保证与运行时注册表同步。 |
| [assistantInteractionContract.ts](../../../shared/assistantInteractionContract.ts.md) | src/shared/assistantInteractionContract.ts | Assistant 待用户交互（permission / choice / 文件上传）的跨边界合约：定义选项数、文件数与字节上限，以及归一化、投影、解析与确定性响应文案生成的唯一实现。 |
| [assistantWireContract.ts](../../../shared/assistantWireContract.ts.md) | src/shared/assistantWireContract.ts | Assistant Workspace / SkillRunner 侧边栏的跨进程 wire 合约：快照 schema 版本、禁止上线的内部字段清单、publication envelope 与 transcript/delta/permission 键集合、消息类型与 shell/child 动作词表。 |
| [assistantWorkspacePublication.ts](../publication/assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspacePublicationHost.ts](assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspacePublicationRuntime.ts](../publication/assistantWorkspacePublicationRuntime.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [assistantWorkspaceSidebar.ts](assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [assistantWorkspaceTranscriptPublication.ts](../publication/assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |
| [fileSystem.ts](../../../utils/fileSystem.ts.md) | src/utils/fileSystem.ts | 在系统文件管理器中打开指定目录，优先使用 nsIFile 的 launch，退化到 reveal，并在路径为空或不存在时抛出明确错误。 |
| [selectionContext.ts](../../selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [skillRunnerRunDialog.ts](../../skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerWorkspaceSurface.ts](../../skillRunner/surface/skillRunnerWorkspaceSurface.ts.md) | src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts | 把 SkillRunner 工作区适配到 Assistant Workspace 共享 surface 契约：把工作区变更映射为发布类型，构造 hint、交互区、控制徽标与 composer 状态，并注册统一的 publication adapter。 |
| [workflowSubmissionQueue.ts](../../../jobQueue/workflowSubmissionQueue.ts.md) | src/jobQueue/workflowSubmissionQueue.ts | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |
| [workflowSubmissionQueueContracts.ts](../../../jobQueue/workflowSubmissionQueueContracts.ts.md) | src/jobQueue/workflowSubmissionQueueContracts.ts | 工作流提交队列的类型契约：定义 branded ID、后端作用域、展示身份、槽位状态与让出/恢复原因等纯类型，不含运行时逻辑。 |
| [zoteroHostCapabilityBroker.ts](../../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [ztoolkit.ts](../../../utils/ztoolkit.ts.md) | src/utils/ztoolkit.ts | zotero-plugin-toolkit 的初始化与扩展：创建并缓存 MyToolkit 实例、在诊断非详细模式下静音 toolkit 自身日志，并提供剪贴板复制能力。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceSidebar.ts](assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSkillRunnerHostActionHandler | 函数 | 884–901 | 构造 SkillRunner 域动作处理器，绑定旧后端服务的 action 能力。 |
| handleAcpChatAction | 函数 | 861–874 | ACP Chat 域动作处理器：模型切换、取消、模式设置等操作的统一入口。 |
| handleAcpSkillRunAction | 函数 | 842–859 | ACP Skills 域动作处理器：审批、恢复与取消 skill run 的统一入口。 |
| handleChildAction | 函数 | 903–1098 | 子面板动作总入口：按 owner 分派到具体域处理器并统一错误与结果回传。 |
