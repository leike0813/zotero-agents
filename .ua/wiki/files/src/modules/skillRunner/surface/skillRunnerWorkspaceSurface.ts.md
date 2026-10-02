
# src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/surface](../../../../../modules/src/modules/skillRunner/surface.md)
<!-- node: file:src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts -->

把 SkillRunner 工作区适配到 Assistant Workspace 共享 surface 契约：把工作区变更映射为发布类型，构造 hint、交互区、控制徽标与 composer 状态，并注册统一的 publication adapter。
源码：[src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts](../../../../../../../src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts)

## 符号（7）
<!-- node: function:src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts:mapSkillRunnerChangeToPublicationKinds -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts:prepareSkillRunnerOwnerNavigation -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts:readSkillRunnerWorkspaceRegions -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts:skillRunnerAutoReplyBadge -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts:skillRunnerComposerStatus -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts:skillRunnerControlBadge -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts:skillRunnerWorkspaceHint -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| mapSkillRunnerChangeToPublicationKinds | 函数 | 92–99 | 简单 | publication、mapping、assistant | 0 | 把工作区变更类型映射为 Assistant Workspace 的发布类型，决定哪些区域需要刷新。 |
| prepareSkillRunnerOwnerNavigation | 函数 | 407–495 | 复杂 | navigation、assistant、ui、skillrunner | 0 | 准备 owner 导航结构：把任务分组映射为导航条目并标注需要 attention 的项。 |
| readSkillRunnerWorkspaceRegions | 函数 | 298–391 | 复杂 | projection、assistant、signature、ui | 0 | 读取 SkillRunner 工作区各托管区域的当前内容与签名，供共享 surface 组件做区域级比较。 |
| skillRunnerAutoReplyBadge | 函数 | 228–256 | 中等 | ui、badge、assistant、state | 1 | 构造自动回复观察状态的徽标，提示用户当前是否有待确认的自动回复。 |
| skillRunnerComposerStatus | 函数 | 269–296 | 中等 | ui、composer、assistant、state | 1 | 构造输入区状态文案与可用性，表达是否可以发送消息及原因。 |
| skillRunnerControlBadge | 函数 | 180–221 | 中等 | ui、badge、assistant、state | 1 | 构造工具栏控制区的状态徽标，表达运行中、等待与失败等语义。 |
| skillRunnerWorkspaceHint | 函数 | 103–132 | 中等 | ui、assistant、banner | 1 | 根据工作区模型生成顶部提示条内容，如后端不可用或需要重新授权。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantInteractionContract.ts](../../../shared/assistantInteractionContract.ts.md) | src/shared/assistantInteractionContract.ts | Assistant 待用户交互（permission / choice / 文件上传）的跨边界合约：定义选项数、文件数与字节上限，以及归一化、投影、解析与确定性响应文案生成的唯一实现。 |
| [assistantWorkspacePublication.ts](../../assistant/publication/assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspacePublicationRuntime.ts](../../assistant/publication/assistantWorkspacePublicationRuntime.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [assistantWorkspaceSurfaceSkeleton.ts](../../assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts | 工作区 surface 骨架：提供 change kind 映射、owner 区域读取、owner 控件构造与排队导航条目列表等跨 domain 共用的最小 surface 能力。 |
| [assistantWorkspaceTranscriptPublication.ts](../../assistant/publication/assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |
| [skillRunnerRunDialog.ts](skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerRunStore.ts](../run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceActionRouter.ts](../../assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspacePublicationHost.ts](../../assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspaceSidebar.ts](../../assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| mapSkillRunnerChangeToPublicationKinds | 函数 | 92–99 | 把工作区变更类型映射为 Assistant Workspace 的发布类型，决定哪些区域需要刷新。 |
| readSkillRunnerWorkspaceRegions | 函数 | 298–391 | 读取 SkillRunner 工作区各托管区域的当前内容与签名，供共享 surface 组件做区域级比较。 |
