
# src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/publication](../../../../../modules/src/modules/assistant/publication.md)
<!-- node: file:src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts -->

发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。
源码：[src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts](../../../../../../../src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts)

## 符号（4）
<!-- node: class:src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts:AssistantWorkspacePublicationRuntime -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts:defineAssistantWorkspacePublicationAdapter -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts:publishAssistantWorkspaceInitialization -->
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts:readProfiledTranscriptPage -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AssistantWorkspacePublicationRuntime | 类 | 391–1116 | 复杂 | runtime、publication、assistant、coordination | 0 | 发布运行时：持有各 domain adapter 与协调器，按 owner 驱动初始化、分页读取、状态脉冲与发布节奏。 |
| defineAssistantWorkspacePublicationAdapter | 函数 | 85–99 | 简单 | factory、adapter、publication、declarative | 0 | 以领域声明式方式定义发布 adapter，绑定 domain 到 surface 的映射关系。 |
| publishAssistantWorkspaceInitialization | 函数 | 206–348 | 中等 | publication、initialization、transcript、owner-first | 0 | 执行工作区初始化发布：先发 loading-first 空快照，再异步补齐 indexed page 与 full mirror。 |
| readProfiledTranscriptPage | 函数 | 154–204 | 中等 | transcript、pagination、profiler、performance | 0 | 在 profiler 计时包裹下读取 transcript 分页，记录该次读取的耗时样本。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimePerformanceProfiler.ts](../../acp/diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [assistantExecutionDisplayPolicy.ts](assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantWorkspacePublication.ts](assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspacePublicationCoordinator.ts](assistantWorkspacePublicationCoordinator.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts | 发布协调器：把 runtime 产出的发布请求按 owner 排队、去重与节流，并跟踪 ack 生命周期与 lane 占用。 |
| [assistantWorkspaceTranscriptPublication.ts](assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatWorkspaceSurface.ts](../../acp/chat/acpChatWorkspaceSurface.ts.md) | src/modules/acp/chat/acpChatWorkspaceSurface.ts | ACP Chat 工作区 surface adapter：把后端 conversation 变化映射为 publication kinds，并投影 transcript、toolbar、banner 等各区域的可见内容。 |
| [acpSkillsWorkspaceSurface.ts](../../acp/skillRun/acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |
| [assistantReadonlyPublication.ts](../../harness/assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [assistantWorkspaceActionRouter.ts](../workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspacePublicationHost.ts](../workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspaceSidebar.ts](../workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [assistantWorkspaceSurfaceSkeleton.ts](../workspace/assistantWorkspaceSurfaceSkeleton.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts | 工作区 surface 骨架：提供 change kind 映射、owner 区域读取、owner 控件构造与排队导航条目列表等跨 domain 共用的最小 surface 能力。 |
| [skillRunnerWorkspaceSurface.ts](../../skillRunner/surface/skillRunnerWorkspaceSurface.ts.md) | src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts | 把 SkillRunner 工作区适配到 Assistant Workspace 共享 surface 契约：把工作区变更映射为发布类型，构造 hint、交互区、控制徽标与 composer 状态，并注册统一的 publication adapter。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| AssistantWorkspacePublicationRuntime | 类 | 391–1116 | 发布运行时：持有各 domain adapter 与协调器，按 owner 驱动初始化、分页读取、状态脉冲与发布节奏。 |
| defineAssistantWorkspacePublicationAdapter | 函数 | 85–99 | 以领域声明式方式定义发布 adapter，绑定 domain 到 surface 的映射关系。 |
