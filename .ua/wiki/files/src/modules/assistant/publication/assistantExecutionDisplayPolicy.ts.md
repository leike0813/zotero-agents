
# src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/publication](../../../../../modules/src/modules/assistant/publication.md)
<!-- node: file:src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts -->

Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。
源码：[src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts](../../../../../../../src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts)

## 符号（8）
<!-- node: function:src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts:canPublishAssistantWorkspaceUpdate -->
<!-- node: function:src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts:ensureAssistantExecutionDisplayModeObserver -->
<!-- node: function:src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts:getAssistantExecutionDisplayMode -->
<!-- node: function:src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts:isAssistantExecutionDisplayMode -->
<!-- node: function:src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts:notifyAssistantExecutionDisplayMode -->
<!-- node: function:src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts:releaseAssistantExecutionDisplayModeObserver -->
<!-- node: function:src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts:setAssistantExecutionDisplayMode -->
<!-- node: function:src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts:subscribeAssistantExecutionDisplayMode -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| canPublishAssistantWorkspaceUpdate | 函数 | 117–128 | 简单 | assistant、显示策略、validation | 0 | 按当前模式与发布节流判断某次工作区更新是否应当立即发出。 |
| ensureAssistantExecutionDisplayModeObserver | 函数 | 59–71 | 简单 | assistant、显示策略、utility | 0 | 确保首选项观察者已注册，重复调用不会重复监听。 |
| [getAssistantExecutionDisplayMode](../../../../../symbols/src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts/getAssistantExecutionDisplayMode.md) | 函数 | 37–45 | 简单 | assistant、显示策略、query | 5 | 读取当前显示模式，首次访问时从插件首选项加载。 |
| isAssistantExecutionDisplayMode | 函数 | 29–35 | 简单 | assistant、显示策略、validation | 1 | 判定字符串是否为已知显示模式。 |
| notifyAssistantExecutionDisplayMode | 函数 | 47–57 | 简单 | assistant、显示策略、utility | 0 | 向订阅者广播显示模式变更，供依赖发布频率的组件即时调整。 |
| releaseAssistantExecutionDisplayModeObserver | 函数 | 73–82 | 简单 | assistant、显示策略、lifecycle | 0 | 释放首选项观察者，模块不再需要时解除监听。 |
| setAssistantExecutionDisplayMode | 函数 | 84–93 | 简单 | assistant、显示策略、configuration | 1 | 切换显示模式并持久化到插件首选项，随后广播给订阅者。 |
| subscribeAssistantExecutionDisplayMode | 函数 | 95–107 | 简单 | assistant、显示策略、event-handler | 0 | 订阅显示模式变更，返回取消订阅函数供组件卸载使用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatTranscriptMirror.ts](../../acp/chat/acpChatTranscriptMirror.ts.md) | src/modules/acp/chat/acpChatTranscriptMirror.ts | ACP Chat 的 transcript 镜像层：把 ACP session update 投影为 conversation item，维护 live/streaming 状态，并按 owner 提供有界分页读取、LRU 缓存与后台 hydrate 调度。 |
| [acpChatWorkspaceDataPlane.ts](../../acp/chat/acpChatWorkspaceDataPlane.ts.md) | src/modules/acp/chat/acpChatWorkspaceDataPlane.ts | ACP Chat 的 workspace 数据面：把 session runtime 投影为 Assistant Workspace read model，处理 owner 导航、transcript 分页与 transcript 事件发布，并向订阅者派发 workspace change。 |
| [acpChatWorkspaceEmissionFacade.ts](../../acp/chat/acpChatWorkspaceEmissionFacade.ts.md) | src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts | ACP Chat workspace 事件发布面的宿主槽位模块：定义 emission 类型契约与 register/get 访问器，使 acpSessionManager 域核心无需运行时 import 数据面即可发布事件。 |
| [acpChatWorkspaceSurface.ts](../../acp/chat/acpChatWorkspaceSurface.ts.md) | src/modules/acp/chat/acpChatWorkspaceSurface.ts | ACP Chat 工作区 surface adapter：把后端 conversation 变化映射为 publication kinds，并投影 transcript、toolbar、banner 等各区域的可见内容。 |
| [acpRuntimeReplayProductionPorts.ts](../../acp/diagnostics/acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |
| [acpSessionManager.ts](../../acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunnerOrchestrator.ts](../../acp/skillRun/acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunPersistence.ts](../../acp/skillRun/acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunRecovery.ts](../../acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpSkillRunStore.ts](../../acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunTranscriptMirror.ts](../../acp/skillRun/acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [acpSkillRunWorkspaceDataPlane.ts](../../acp/skillRun/acpSkillRunWorkspaceDataPlane.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts | ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。 |
| [acpSkillsWorkspaceSurface.ts](../../acp/skillRun/acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |
| [assistantTranscriptMirrorStore.ts](assistantTranscriptMirrorStore.ts.md) | src/modules/assistant/publication/assistantTranscriptMirrorStore.ts | Assistant Workspace 的 transcript 镜像仓库：按 owner 维护镜像条目、合并流式事件，并管理冷镜像 LRU 与后台水合。 |
| [assistantTranscriptPageProjection.ts](assistantTranscriptPageProjection.ts.md) | src/modules/assistant/publication/assistantTranscriptPageProjection.ts | Assistant transcript 分页投影：把镜像条目过滤为 UI 可见的一页，保持分页条数与游标语义稳定。 |
| [assistantWorkspacePublicationHost.ts](../workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspacePublicationRuntime.ts](assistantWorkspacePublicationRuntime.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [assistantWorkspaceSidebar.ts](../workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [preferenceScript.ts](../../preferenceScript.ts.md) | src/modules/preferenceScript.ts | 首选项面板（preferences.xhtml）的全部交互绑定：一个超长 bindPrefEvents 集中处理所有偏好项的读取、回写、即时生效与 UI 同步，并处理工作流运行时、内容包订阅、Assistant 显示策略和本地运行时版本等跨模块联动。 |
| [skillRunnerRunDialog.ts](../../skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| canPublishAssistantWorkspaceUpdate | 函数 | 117–128 | 按当前模式与发布节流判断某次工作区更新是否应当立即发出。 |
| [getAssistantExecutionDisplayMode](../../../../../symbols/src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts/getAssistantExecutionDisplayMode.md) | 函数 | 37–45 | 读取当前显示模式，首次访问时从插件首选项加载。 |
| isAssistantExecutionDisplayMode | 函数 | 29–35 | 判定字符串是否为已知显示模式。 |
| setAssistantExecutionDisplayMode | 函数 | 84–93 | 切换显示模式并持久化到插件首选项，随后广播给订阅者。 |
| subscribeAssistantExecutionDisplayMode | 函数 | 95–107 | 订阅显示模式变更，返回取消订阅函数供组件卸载使用。 |
