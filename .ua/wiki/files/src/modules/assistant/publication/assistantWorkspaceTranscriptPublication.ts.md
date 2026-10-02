
# src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/publication](../../../../../modules/src/modules/assistant/publication.md)
<!-- node: file:src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts -->

transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。
源码：[src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts](../../../../../../../src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts)

## 符号（6）
<!-- node: class:src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts:AssistantWorkspaceTranscriptAccumulator -->
<!-- node: class:src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts:AssistantWorkspaceTranscriptProjection -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts:createAssistantWorkspaceTranscriptMutation -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts:createAssistantWorkspaceTranscriptPage -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts:normalizeAssistantWorkspaceTranscriptItem -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts:parseAssistantWorkspaceTranscriptPageRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AssistantWorkspaceTranscriptAccumulator | 类 | 326–372 | 简单 | transcript、accumulator、bounded-buffer、streaming | 0 | transcript 累积器：以有界窗口合并流式更新，避免长会话内存无上限增长。 |
| AssistantWorkspaceTranscriptProjection | 类 | 213–324 | 简单 | transcript、projection、assistant、filtering | 0 | transcript 投影器：把领域快照投影为规范化条目序列并做可见性过滤。 |
| createAssistantWorkspaceTranscriptMutation | 函数 | 591–627 | 简单 | transcript、mutation、bounded-buffer、projection | 0 | 构造增量 transcript mutation，并受条数与字节双重上限约束。 |
| createAssistantWorkspaceTranscriptPage | 函数 | 634–664 | 简单 | transcript、pagination、factory、projection | 0 | 构造分页结果 DTO（条目、游标与是否已到末页）。 |
| normalizeAssistantWorkspaceTranscriptItem | 函数 | 463–589 | 中等 | normalization、transcript、projection、assistant | 0 | 规范化 transcript 条目：补齐稳定 id、可见性与时间字段，剔除内部字段。 |
| parseAssistantWorkspaceTranscriptPageRequest | 函数 | 82–150 | 中等 | parsing、transcript、pagination、validation | 1 | 解析并校验 transcript 分页请求参数，裁剪越界页码与非法 owner。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspacePublication.ts](assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatTranscriptMirror.ts](../../acp/chat/acpChatTranscriptMirror.ts.md) | src/modules/acp/chat/acpChatTranscriptMirror.ts | ACP Chat 的 transcript 镜像层：把 ACP session update 投影为 conversation item，维护 live/streaming 状态，并按 owner 提供有界分页读取、LRU 缓存与后台 hydrate 调度。 |
| [acpChatWorkspaceDataPlane.ts](../../acp/chat/acpChatWorkspaceDataPlane.ts.md) | src/modules/acp/chat/acpChatWorkspaceDataPlane.ts | ACP Chat 的 workspace 数据面：把 session runtime 投影为 Assistant Workspace read model，处理 owner 导航、transcript 分页与 transcript 事件发布，并向订阅者派发 workspace change。 |
| [acpChatWorkspaceSurface.ts](../../acp/chat/acpChatWorkspaceSurface.ts.md) | src/modules/acp/chat/acpChatWorkspaceSurface.ts | ACP Chat 工作区 surface adapter：把后端 conversation 变化映射为 publication kinds，并投影 transcript、toolbar、banner 等各区域的可见内容。 |
| [acpSessionManager.ts](../../acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunStore.ts](../../acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunTranscriptMirror.ts](../../acp/skillRun/acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [assistantReadonlyPublication.ts](../../harness/assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [assistantTranscriptMirrorStore.ts](assistantTranscriptMirrorStore.ts.md) | src/modules/assistant/publication/assistantTranscriptMirrorStore.ts | Assistant Workspace 的 transcript 镜像仓库：按 owner 维护镜像条目、合并流式事件，并管理冷镜像 LRU 与后台水合。 |
| [assistantWorkspaceActionRouter.ts](../workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspacePublication.ts](assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspacePublicationCoordinator.ts](assistantWorkspacePublicationCoordinator.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts | 发布协调器：把 runtime 产出的发布请求按 owner 排队、去重与节流，并跟踪 ack 生命周期与 lane 占用。 |
| [assistantWorkspacePublicationRuntime.ts](assistantWorkspacePublicationRuntime.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [skillRunnerRunDialog.ts](../../skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerWorkspaceSurface.ts](../../skillRunner/surface/skillRunnerWorkspaceSurface.ts.md) | src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts | 把 SkillRunner 工作区适配到 Assistant Workspace 共享 surface 契约：把工作区变更映射为发布类型，构造 hint、交互区、控制徽标与 composer 状态，并注册统一的 publication adapter。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| AssistantWorkspaceTranscriptAccumulator | 类 | 326–372 | transcript 累积器：以有界窗口合并流式更新，避免长会话内存无上限增长。 |
| AssistantWorkspaceTranscriptProjection | 类 | 213–324 | transcript 投影器：把领域快照投影为规范化条目序列并做可见性过滤。 |
| createAssistantWorkspaceTranscriptMutation | 函数 | 591–627 | 构造增量 transcript mutation，并受条数与字节双重上限约束。 |
| createAssistantWorkspaceTranscriptPage | 函数 | 634–664 | 构造分页结果 DTO（条目、游标与是否已到末页）。 |
| normalizeAssistantWorkspaceTranscriptItem | 函数 | 463–589 | 规范化 transcript 条目：补齐稳定 id、可见性与时间字段，剔除内部字段。 |
| parseAssistantWorkspaceTranscriptPageRequest | 函数 | 82–150 | 解析并校验 transcript 分页请求参数，裁剪越界页码与非法 owner。 |
