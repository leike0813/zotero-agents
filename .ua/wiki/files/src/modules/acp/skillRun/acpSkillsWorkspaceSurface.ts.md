
# src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts -->

ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。
源码：[src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts](../../../../../../../src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts)

## 符号（5）
<!-- node: function:src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts:acpSkillRunHint -->
<!-- node: function:src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts:acpSkillRunInteractionState -->
<!-- node: function:src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts:mapAcpSkillRunChangeToPublicationKinds -->
<!-- node: function:src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts:prepareAcpSkillsOwnerNavigation -->
<!-- node: function:src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts:readAcpSkillRunWorkspaceRegions -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acpSkillRunHint | 函数 | 126–174 | 中等 | projection、hint、acp、skill-run | 0 | 构造 skill run 的提示区内容，覆盖等待审批、等待用户输入与失败三类语义。 |
| acpSkillRunInteractionState | 函数 | 99–124 | 简单 | state-machine、acp、skill-run、interaction | 0 | 解析 skill run 当前的交互状态（无交互、待审批、待用户输入、已取消）。 |
| mapAcpSkillRunChangeToPublicationKinds | 函数 | 76–83 | 简单 | mapping、acp、skill-run、publication | 0 | 把 skill run 状态变化映射为统一 publication kinds。 |
| prepareAcpSkillsOwnerNavigation | 函数 | 449–544 | 中等 | navigation、acp、skill-run、owner-switch | 0 | 在切换 skill run owner 前准备导航状态，确保 owner-first 首屏不被历史快照阻塞。 |
| readAcpSkillRunWorkspaceRegions | 函数 | 193–447 | 复杂 | projection、regions、acp、skill-run | 0 | 读取 ACP Skills 工作区各区域可见内容，产出可发布快照。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpExecutionProgress.ts](../transport/acpExecutionProgress.ts.md) | src/modules/acp/transport/acpExecutionProgress.ts | ACP 执行进度累计器：按会话统计执行阶段与消息计数，供 UI 显示「正在执行/已完成」进度并在恢复时还原。 |
| [acpSkillRunActions.ts](acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunStatus.ts](acpSkillRunStatus.ts.md) | src/modules/acp/skillRun/acpSkillRunStatus.ts | ACP Skill Run 状态机判定集合：集中回答某状态是否终态、活跃、可恢复，以及终态后能否继续对话与 prompt 失败是否可重试。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunWorkspaceSelection.ts](acpSkillRunWorkspaceSelection.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts | ACP Skills 工作区的选中 run 管理：设置、确保与读取当前选中的 requestId。 |
| [assistantExecutionDisplayPolicy.ts](../../assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantInteractionContract.ts](../../../shared/assistantInteractionContract.ts.md) | src/shared/assistantInteractionContract.ts | Assistant 待用户交互（permission / choice / 文件上传）的跨边界合约：定义选项数、文件数与字节上限，以及归一化、投影、解析与确定性响应文案生成的唯一实现。 |
| [assistantWorkspacePublication.ts](../../assistant/publication/assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspacePublicationRuntime.ts](../../assistant/publication/assistantWorkspacePublicationRuntime.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [assistantWorkspaceSurfaceSkeleton.ts](../../assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts | 工作区 surface 骨架：提供 change kind 映射、owner 区域读取、owner 控件构造与排队导航条目列表等跨 domain 共用的最小 surface 能力。 |
| [displayName.ts](../../../backends/displayName.ts.md) | src/backends/displayName.ts | 解析后端显示名：对托管本地后端返回本地化名称，其余回退到用户配置名或后端 ID 本身。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [workflowSubmissionQueue.ts](../../../jobQueue/workflowSubmissionQueue.ts.md) | src/jobQueue/workflowSubmissionQueue.ts | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |
| [workflowSubmissionQueueContracts.ts](../../../jobQueue/workflowSubmissionQueueContracts.ts.md) | src/jobQueue/workflowSubmissionQueueContracts.ts | 工作流提交队列的类型契约：定义 branded ID、后端作用域、展示身份、槽位状态与让出/恢复原因等纯类型，不含运行时逻辑。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceActionRouter.ts](../../assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspacePublicationHost.ts](../../assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspaceSidebar.ts](../../assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| mapAcpSkillRunChangeToPublicationKinds | 函数 | 76–83 | 把 skill run 状态变化映射为统一 publication kinds。 |
| readAcpSkillRunWorkspaceRegions | 函数 | 193–447 | 读取 ACP Skills 工作区各区域可见内容，产出可发布快照。 |
