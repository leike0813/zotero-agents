
# src/modules/assistant/publication/assistantWorkspacePublication.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/publication](../../../../../modules/src/modules/assistant/publication.md)
<!-- node: file:src/modules/assistant/publication/assistantWorkspacePublication.ts -->

Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。
源码：[src/modules/assistant/publication/assistantWorkspacePublication.ts](../../../../../../../src/modules/assistant/publication/assistantWorkspacePublication.ts)

## 符号（12）
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublication.ts:assertAssistantWorkspacePublication -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublication.ts:assertAssistantWorkspacePublicationAck -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublication.ts:assertPublicationPayloadInvariant -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublication.ts:assertTranscriptRegionInvariant -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublication.ts:createAcpChatWorkspaceOwner -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublication.ts:createAcpSkillsWorkspaceOwner -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublication.ts:createFailedTranscriptRegion -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublication.ts:createIdleTranscriptRegion -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublication.ts:createLoadingTranscriptRegion -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublication.ts:createSkillRunnerWorkspaceOwner -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublication.ts:projectAssistantWorkspaceOptionGroup -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublication.ts:projectAssistantWorkspacePermissionRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertAssistantWorkspacePublication | 函数 | 1255–1396 | 中等 | validation、contract、assertion、assistant | 0 | 运行时断言发布体符合 envelope/payload 契约，违规立即抛错防止 wire 漂移。 |
| assertAssistantWorkspacePublicationAck | 函数 | 1737–1814 | 中等 | validation、ack、assertion、assistant | 1 | 断言宿主回执结构合法，是发布链路可靠性的最后一道闸门。 |
| assertPublicationPayloadInvariant | 函数 | 1398–1708 | 复杂 | validation、contract、assertion、publication | 0 | 递归校验发布 payload 的键集合与值形状，拒绝任何未注册字段或类型不符的取值。 |
| assertTranscriptRegionInvariant | 函数 | 1833–1858 | 简单 | validation、transcript、assertion、contract | 0 | 校验 transcript 区域描述的状态与字段组合合法，杜绝非法 wire 组合。 |
| [createAcpChatWorkspaceOwner](../../../../../symbols/src/modules/assistant/publication/assistantWorkspacePublication.ts/createAcpChatWorkspaceOwner.md) | 函数 | 1153–1168 | 简单 | factory、owner、acp、assistant | 2 | 构造 ACP Chat 工作区 owner 描述（backend + conversation）。 |
| [createAcpSkillsWorkspaceOwner](../../../../../symbols/src/modules/assistant/publication/assistantWorkspacePublication.ts/createAcpSkillsWorkspaceOwner.md) | 函数 | 1170–1178 | 简单 | factory、owner、acp、skill-run | 2 | 构造 ACP Skills 工作区 owner 描述（requestId）。 |
| createFailedTranscriptRegion | 函数 | 1241–1253 | 简单 | factory、transcript、error-handling、assistant | 0 | 构造失败态 transcript 区域描述，携带可诊断的错误码。 |
| createIdleTranscriptRegion | 函数 | 1210–1218 | 简单 | factory、transcript、state、assistant | 1 | 构造空闲态 transcript 区域描述。 |
| createLoadingTranscriptRegion | 函数 | 1220–1231 | 简单 | factory、transcript、loading、assistant | 1 | 构造加载态 transcript 区域描述，区分 owner 级 loading 语义。 |
| createSkillRunnerWorkspaceOwner | 函数 | 1187–1202 | 简单 | factory、owner、skillrunner、assistant | 1 | 构造 SkillRunner 工作区 owner 描述（requestId 或 runKey 回退）。 |
| projectAssistantWorkspaceOptionGroup | 函数 | 693–713 | 简单 | projection、contract、assistant、options | 0 | 把选项组（模型/推理档/模式）投影为发布体 DTO。 |
| projectAssistantWorkspacePermissionRequest | 函数 | 596–663 | 中等 | projection、permission、contract、assistant | 0 | 把权限请求投影为发布体 DTO，固定键集合并剔除内部 handler 与 native ID。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantActionContract.ts](../../../shared/assistantActionContract.ts.md) | src/shared/assistantActionContract.ts | Assistant Workspace 动作负载的编译期类型镜像：描述 shell/子页面与宿主之间每个 action 各自携带的 payload 字段，由 publication 侧的 drift guard 保证与运行时注册表同步。 |
| [assistantInteractionContract.ts](../../../shared/assistantInteractionContract.ts.md) | src/shared/assistantInteractionContract.ts | Assistant 待用户交互（permission / choice / 文件上传）的跨边界合约：定义选项数、文件数与字节上限，以及归一化、投影、解析与确定性响应文案生成的唯一实现。 |
| [assistantMessageCounts.ts](assistantMessageCounts.ts.md) | src/modules/assistant/publication/assistantMessageCounts.ts | Assistant 消息计数工具：创建、规整与克隆消息计数三元组，并提供执行开始/结束与逐条自增的计数维护入口。 |
| [assistantWireContract.ts](../../../shared/assistantWireContract.ts.md) | src/shared/assistantWireContract.ts | Assistant Workspace / SkillRunner 侧边栏的跨进程 wire 合约：快照 schema 版本、禁止上线的内部字段清单、publication envelope 与 transcript/delta/permission 键集合、消息类型与 shell/child 动作词表。 |
| [assistantWorkspaceTranscriptPublication.ts](assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |
| [workflowSubmissionQueueContracts.ts](../../../jobQueue/workflowSubmissionQueueContracts.ts.md) | src/jobQueue/workflowSubmissionQueueContracts.ts | 工作流提交队列的类型契约：定义 branded ID、后端作用域、展示身份、槽位状态与让出/恢复原因等纯类型，不含运行时逻辑。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatWorkspaceDataPlane.ts](../../acp/chat/acpChatWorkspaceDataPlane.ts.md) | src/modules/acp/chat/acpChatWorkspaceDataPlane.ts | ACP Chat 的 workspace 数据面：把 session runtime 投影为 Assistant Workspace read model，处理 owner 导航、transcript 分页与 transcript 事件发布，并向订阅者派发 workspace change。 |
| [acpChatWorkspaceSurface.ts](../../acp/chat/acpChatWorkspaceSurface.ts.md) | src/modules/acp/chat/acpChatWorkspaceSurface.ts | ACP Chat 工作区 surface adapter：把后端 conversation 变化映射为 publication kinds，并投影 transcript、toolbar、banner 等各区域的可见内容。 |
| [acpSkillRunTranscriptMirror.ts](../../acp/skillRun/acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [acpSkillsWorkspaceSurface.ts](../../acp/skillRun/acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |
| [assistantReadonlyPublication.ts](../../harness/assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [assistantWorkspaceActionRouter.ts](../workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspacePublicationCoordinator.ts](assistantWorkspacePublicationCoordinator.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts | 发布协调器：把 runtime 产出的发布请求按 owner 排队、去重与节流，并跟踪 ack 生命周期与 lane 占用。 |
| [assistantWorkspacePublicationHost.ts](../workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspacePublicationLabels.ts](assistantWorkspacePublicationLabels.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts | 集中构建 Assistant Workspace 全部展示标签的文案表，避免各区域散落 i18n 键拼接。 |
| [assistantWorkspacePublicationRuntime.ts](assistantWorkspacePublicationRuntime.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [assistantWorkspaceSidebar.ts](../workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [assistantWorkspaceSurfaceSkeleton.ts](../workspace/assistantWorkspaceSurfaceSkeleton.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts | 工作区 surface 骨架：提供 change kind 映射、owner 区域读取、owner 控件构造与排队导航条目列表等跨 domain 共用的最小 surface 能力。 |
| [assistantWorkspaceTranscriptPublication.ts](assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |
| [skillRunnerRunDialog.ts](../../skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerWorkspaceSurface.ts](../../skillRunner/surface/skillRunnerWorkspaceSurface.ts.md) | src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts | 把 SkillRunner 工作区适配到 Assistant Workspace 共享 surface 契约：把工作区变更映射为发布类型，构造 hint、交互区、控制徽标与 composer 状态，并注册统一的 publication adapter。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertAssistantWorkspacePublication | 函数 | 1255–1396 | 运行时断言发布体符合 envelope/payload 契约，违规立即抛错防止 wire 漂移。 |
| assertAssistantWorkspacePublicationAck | 函数 | 1737–1814 | 断言宿主回执结构合法，是发布链路可靠性的最后一道闸门。 |
| [createAcpChatWorkspaceOwner](../../../../../symbols/src/modules/assistant/publication/assistantWorkspacePublication.ts/createAcpChatWorkspaceOwner.md) | 函数 | 1153–1168 | 构造 ACP Chat 工作区 owner 描述（backend + conversation）。 |
| [createAcpSkillsWorkspaceOwner](../../../../../symbols/src/modules/assistant/publication/assistantWorkspacePublication.ts/createAcpSkillsWorkspaceOwner.md) | 函数 | 1170–1178 | 构造 ACP Skills 工作区 owner 描述（requestId）。 |
| createFailedTranscriptRegion | 函数 | 1241–1253 | 构造失败态 transcript 区域描述，携带可诊断的错误码。 |
| createIdleTranscriptRegion | 函数 | 1210–1218 | 构造空闲态 transcript 区域描述。 |
| createLoadingTranscriptRegion | 函数 | 1220–1231 | 构造加载态 transcript 区域描述，区分 owner 级 loading 语义。 |
| createSkillRunnerWorkspaceOwner | 函数 | 1187–1202 | 构造 SkillRunner 工作区 owner 描述（requestId 或 runKey 回退）。 |
| projectAssistantWorkspaceOptionGroup | 函数 | 693–713 | 把选项组（模型/推理档/模式）投影为发布体 DTO。 |
| projectAssistantWorkspacePermissionRequest | 函数 | 596–663 | 把权限请求投影为发布体 DTO，固定键集合并剔除内部 handler 与 native ID。 |
