
# src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/workspace](../../../../../modules/src/modules/assistant/workspace.md)
<!-- node: file:src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts -->

工作区 surface 骨架：提供 change kind 映射、owner 区域读取、owner 控件构造与排队导航条目列表等跨 domain 共用的最小 surface 能力。
源码：[src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts](../../../../../../../src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts)

## 符号（6）
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts:createWorkspaceOwnerControl -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts:defineAssistantWorkspaceSurfaceAdapter -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts:listQueuedWorkspaceNavigationEntries -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts:mapWorkspaceChangeKindsToPublicationKinds -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts:readWorkspaceOwnerRegions -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts:skillRunSecondaryLabel -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createWorkspaceOwnerControl | 函数 | 83–105 | 简单 | factory、navigation、owner、workspace | 0 | 构造 owner 切换控件的展示模型。 |
| defineAssistantWorkspaceSurfaceAdapter | 函数 | 199–213 | 简单 | factory、adapter、workspace、skeleton | 0 | 以骨架形式定义 surface adapter，供测试与未实现域复用同一契约。 |
| listQueuedWorkspaceNavigationEntries | 函数 | 159–197 | 简单 | navigation、queue、workspace、projection | 0 | 列出排队中的工作流导航条目，供 owner 列表提示积压。 |
| [mapWorkspaceChangeKindsToPublicationKinds](../../../../../symbols/src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts/mapWorkspaceChangeKindsToPublicationKinds.md) | 函数 | 38–45 | 简单 | mapping、publication、workspace、adapter | 2 | 把 surface 变化种类映射为统一 publication kinds。 |
| [readWorkspaceOwnerRegions](../../../../../symbols/src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts/readWorkspaceOwnerRegions.md) | 函数 | 60–77 | 简单 | projection、regions、workspace、shared | 2 | 读取指定 owner 的各区域可见内容，供 skeleton adapter 复用。 |
| skillRunSecondaryLabel | 函数 | 118–151 | 简单 | labels、skill-run、presentation、formatting | 0 | 生成 skill run 行的次级说明文案（provider/model 或排队原因）。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspacePublication.ts](../publication/assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspacePublicationRuntime.ts](../publication/assistantWorkspacePublicationRuntime.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [workflowSubmissionQueue.ts](../../../jobQueue/workflowSubmissionQueue.ts.md) | src/jobQueue/workflowSubmissionQueue.ts | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |
| [workflowSubmissionQueueContracts.ts](../../../jobQueue/workflowSubmissionQueueContracts.ts.md) | src/jobQueue/workflowSubmissionQueueContracts.ts | 工作流提交队列的类型契约：定义 branded ID、后端作用域、展示身份、槽位状态与让出/恢复原因等纯类型，不含运行时逻辑。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatWorkspaceSurface.ts](../../acp/chat/acpChatWorkspaceSurface.ts.md) | src/modules/acp/chat/acpChatWorkspaceSurface.ts | ACP Chat 工作区 surface adapter：把后端 conversation 变化映射为 publication kinds，并投影 transcript、toolbar、banner 等各区域的可见内容。 |
| [acpSkillsWorkspaceSurface.ts](../../acp/skillRun/acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |
| [assistantReadonlyPublication.ts](../../harness/assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [skillRunnerWorkspaceSurface.ts](../../skillRunner/surface/skillRunnerWorkspaceSurface.ts.md) | src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts | 把 SkillRunner 工作区适配到 Assistant Workspace 共享 surface 契约：把工作区变更映射为发布类型，构造 hint、交互区、控制徽标与 composer 状态，并注册统一的 publication adapter。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createWorkspaceOwnerControl | 函数 | 83–105 | 构造 owner 切换控件的展示模型。 |
| defineAssistantWorkspaceSurfaceAdapter | 函数 | 199–213 | 以骨架形式定义 surface adapter，供测试与未实现域复用同一契约。 |
| listQueuedWorkspaceNavigationEntries | 函数 | 159–197 | 列出排队中的工作流导航条目，供 owner 列表提示积压。 |
| [mapWorkspaceChangeKindsToPublicationKinds](../../../../../symbols/src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts/mapWorkspaceChangeKindsToPublicationKinds.md) | 函数 | 38–45 | 把 surface 变化种类映射为统一 publication kinds。 |
| [readWorkspaceOwnerRegions](../../../../../symbols/src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts/readWorkspaceOwnerRegions.md) | 函数 | 60–77 | 读取指定 owner 的各区域可见内容，供 skeleton adapter 复用。 |
| skillRunSecondaryLabel | 函数 | 118–151 | 生成 skill run 行的次级说明文案（provider/model 或排队原因）。 |
