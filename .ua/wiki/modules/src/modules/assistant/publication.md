
# src/modules/assistant/publication
> 目录聚合页：10 个文件、58 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts](../../../../files/src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts.md) | 文件 | 8 | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [src/modules/assistant/publication/assistantMessageCounts.ts](../../../../files/src/modules/assistant/publication/assistantMessageCounts.ts.md) | 文件 | 7 | Assistant 消息计数工具：创建、规整与克隆消息计数三元组，并提供执行开始/结束与逐条自增的计数维护入口。 |
| [src/modules/assistant/publication/assistantTranscriptMirrorStore.ts](../../../../files/src/modules/assistant/publication/assistantTranscriptMirrorStore.ts.md) | 文件 | 16 | Assistant Workspace 的 transcript 镜像仓库：按 owner 维护镜像条目、合并流式事件，并管理冷镜像 LRU 与后台水合。 |
| [src/modules/assistant/publication/assistantTranscriptPageProjection.ts](../../../../files/src/modules/assistant/publication/assistantTranscriptPageProjection.ts.md) | 文件 | 3 | Assistant transcript 分页投影：把镜像条目过滤为 UI 可见的一页，保持分页条数与游标语义稳定。 |
| [src/modules/assistant/publication/assistantTranscriptRenderingPreference.ts](../../../../files/src/modules/assistant/publication/assistantTranscriptRenderingPreference.ts.md) | 文件 | 0 | transcript 分页虚拟化开关的读写封装，直接映射到插件首选项。 |
| [src/modules/assistant/publication/assistantWorkspacePublication.ts](../../../../files/src/modules/assistant/publication/assistantWorkspacePublication.ts.md) | 文件 | 12 | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts](../../../../files/src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts.md) | 文件 | 1 | 发布协调器：把 runtime 产出的发布请求按 owner 排队、去重与节流，并跟踪 ack 生命周期与 lane 占用。 |
| [src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts](../../../../files/src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts.md) | 文件 | 1 | 集中构建 Assistant Workspace 全部展示标签的文案表，避免各区域散落 i18n 键拼接。 |
| [src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts](../../../../files/src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts.md) | 文件 | 4 | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts](../../../../files/src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts.md) | 文件 | 6 | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/shared](../../shared.md) | 3 |
| [src/utils](../../utils.md) | 3 |
| [src/modules/acp/diagnostics](../acp/diagnostics.md) | 2 |
| [src/jobQueue](../../jobQueue.md) | 1 |
| [src/modules](../../modules.md) | 1 |
| [src/modules/assistant/workspace](workspace.md) | 1 |
