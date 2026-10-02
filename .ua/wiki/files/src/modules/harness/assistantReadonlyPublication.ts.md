
# src/modules/harness/assistantReadonlyPublication.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/harness](../../../../modules/src/modules/harness.md)
<!-- node: file:src/modules/harness/assistantReadonlyPublication.ts -->

只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。
源码：[src/modules/harness/assistantReadonlyPublication.ts](../../../../../../src/modules/harness/assistantReadonlyPublication.ts)

## 符号（9）
<!-- node: function:src/modules/harness/assistantReadonlyPublication.ts:acpChatConversationModel -->
<!-- node: function:src/modules/harness/assistantReadonlyPublication.ts:createAssistantReadonlyPublicationSession -->
<!-- node: function:src/modules/harness/assistantReadonlyPublication.ts:loadHarnessWorkflows -->
<!-- node: function:src/modules/harness/assistantReadonlyPublication.ts:normalizeAcpItems -->
<!-- node: function:src/modules/harness/assistantReadonlyPublication.ts:paginateTranscriptItems -->
<!-- node: function:src/modules/harness/assistantReadonlyPublication.ts:rebasePageRequest -->
<!-- node: function:src/modules/harness/assistantReadonlyPublication.ts:skillRunnerRunModel -->
<!-- node: function:src/modules/harness/assistantReadonlyPublication.ts:skillRunnerTranscriptItems -->
<!-- node: function:src/modules/harness/assistantReadonlyPublication.ts:summarizeAcpSkillRun -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acpChatConversationModel | 函数 | 314–378 | 中等 | harness、readonly、acp、view-model | 0 | 构造 ACP Chat 会话的只读视图模型，包含后端标识、标题、消息计数与最近更新时间。 |
| createAssistantReadonlyPublicationSession | 函数 | 609–1966 | 复杂 | harness、readonly、session、orchestration、core | 0 | 创建只读发布会话：打开插件状态只读存储、加载后端与工作流，并为分页 transcript、run 详情等请求提供统一的分发入口。 |
| loadHarnessWorkflows | 函数 | 145–171 | 简单 | harness、readonly、workflow、loader | 1 | 按传入目录加载工作流 manifest，供 Harness 页面复刻工作流选择项。 |
| normalizeAcpItems | 函数 | 223–248 | 简单 | harness、readonly、acp、transcript、normalization | 0 | 把 ACP 原始 item 归一化为统一的 transcript 条目形状，保证渲染层只面对一种结构。 |
| paginateTranscriptItems | 函数 | 546–572 | 简单 | harness、readonly、transcript、pagination | 0 | 对 transcript 条目做有界分页，复刻生产路径的页签名与首屏语义。 |
| rebasePageRequest | 函数 | 575–594 | 简单 | harness、readonly、transcript、pagination | 0 | 在 transcript 总数变化后重算分页请求参数，避免越界或空页。 |
| skillRunnerRunModel | 函数 | 419–500 | 中等 | harness、readonly、skillrunner、view-model | 0 | 把 SkillRunner run 投影为只读 DTO，含状态语义、事件计数与 transcript 页引用。 |
| skillRunnerTranscriptItems | 函数 | 502–540 | 中等 | harness、readonly、skillrunner、transcript | 0 | 从 SkillRunner 有界会话历史构造 transcript 条目，SkillRunner 侧的 mirror 即历史本身。 |
| summarizeAcpSkillRun | 函数 | 250–278 | 简单 | harness、readonly、acp、normalization | 0 | 归一化 ACP skill run 记录为列表摘要，抽取 skill 名、状态与关键时间点。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantInteractionContract.ts](../../shared/assistantInteractionContract.ts.md) | src/shared/assistantInteractionContract.ts | Assistant 待用户交互（permission / choice / 文件上传）的跨边界合约：定义选项数、文件数与字节上限，以及归一化、投影、解析与确定性响应文案生成的唯一实现。 |
| [assistantWorkspacePublication.ts](../assistant/publication/assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspacePublicationCoordinator.ts](../assistant/publication/assistantWorkspacePublicationCoordinator.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts | 发布协调器：把 runtime 产出的发布请求按 owner 排队、去重与节流，并跟踪 ack 生命周期与 lane 占用。 |
| [assistantWorkspacePublicationLabels.ts](../assistant/publication/assistantWorkspacePublicationLabels.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts | 集中构建 Assistant Workspace 全部展示标签的文案表，避免各区域散落 i18n 键拼接。 |
| [assistantWorkspacePublicationRuntime.ts](../assistant/publication/assistantWorkspacePublicationRuntime.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [assistantWorkspaceSurfaceSkeleton.ts](../assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts | 工作区 surface 骨架：提供 change kind 映射、owner 区域读取、owner 控件构造与排队导航条目列表等跨 domain 共用的最小 surface 能力。 |
| [assistantWorkspaceTranscriptPublication.ts](../assistant/publication/assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |
| [backendsReadonly.ts](backendsReadonly.ts.md) | src/modules/harness/backendsReadonly.ts | 后端只读快照：从 prefs 读取 backends 配置并归一化为 Harness 专用形状，不做任何 id 重映射或引用同步。 |
| [defaults.ts](../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [loader.ts](../../workflows/loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [pluginStateReadonly.ts](pluginStateReadonly.ts.md) | src/modules/harness/pluginStateReadonly.ts | 插件状态只读存储：以只读方式打开插件 SQLite 库，把 run、任务、请求与上下文表归一化为 Harness 可查询的行集合。 |
| [skillRunnerReadonlyProjection.ts](skillRunnerReadonlyProjection.ts.md) | src/modules/harness/skillRunnerReadonlyProjection.ts | SkillRunner 只读投影：把插件状态中的 run 记录与 sequence 状态投影成 Harness 可见的运行列表，附带状态语义与技能显示名。 |
| [types.ts](../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowVisibility.ts](../workflow/catalog/workflowVisibility.ts.md) | src/modules/workflow/catalog/workflowVisibility.ts | 工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createAssistantReadonlyPublicationSession | 函数 | 609–1966 | 创建只读发布会话：打开插件状态只读存储、加载后端与工作流，并为分页 transcript、run 详情等请求提供统一的分发入口。 |
