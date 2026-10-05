
# src/modules/assistant/workspace
> 目录聚合页：6 个文件、85 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/assistant/workspace/assistantPanelLabels.ts](../../../../files/src/modules/assistant/workspace/assistantPanelLabels.ts.md) | 文件 | 1 | Assistant 面板标签文案表：集中声明各面板标题、按钮、空态与错误提示的本地化文本。 |
| [src/modules/assistant/workspace/assistantSidebarViewModel.ts](../../../../files/src/modules/assistant/workspace/assistantSidebarViewModel.ts.md) | 文件 | 3 | 侧边栏视图模型：构造 scope key 与 render hints，生成侧边栏快照并按区域剥离 transcript 数据以隔离重渲染。 |
| [src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts](../../../../files/src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts.md) | 文件 | 10 | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts](../../../../files/src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts.md) | 文件 | 35 | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [src/modules/assistant/workspace/assistantWorkspaceSidebar.ts](../../../../files/src/modules/assistant/workspace/assistantWorkspaceSidebar.ts.md) | 文件 | 30 | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts](../../../../files/src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts.md) | 文件 | 6 | 工作区 surface 骨架：提供 change kind 映射、owner 区域读取、owner 控件构造与排队导航条目列表等跨 domain 共用的最小 surface 能力。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules/assistant/publication](publication.md) | 15 |
| [src/modules](../../modules.md) | 14 |
| [src/modules/acp/skillRun](../acp/skillRun.md) | 12 |
| [src/modules/acp/chat](../acp/chat.md) | 7 |
| [src/modules/skillRunner/surface](../skillRunner/surface.md) | 6 |
| [src/shared](../../shared.md) | 6 |
| [src/jobQueue](../../jobQueue.md) | 5 |
| [src/utils](../../utils.md) | 5 |
| [src/modules/acp/diagnostics](../acp/diagnostics.md) | 2 |
| [.](../../../index.md) | 1 |
| [src/backends](../../backends.md) | 1 |
| [src/modules/hostBridge/server](../hostBridge/server.md) | 1 |
| [src/modules/skillRunner/run](../skillRunner/run.md) | 1 |
| [src/modules/workflow/settings](../workflow/settings.md) | 1 |
| [src/modules/workflowExecution](../workflowExecution.md) | 1 |
