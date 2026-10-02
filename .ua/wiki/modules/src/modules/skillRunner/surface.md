
# src/modules/skillRunner/surface
> 目录聚合页：7 个文件、40 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/skillRunner/surface/skillRunnerBackendToasts.ts](../../../../files/src/modules/skillRunner/surface/skillRunnerBackendToasts.ts.md) | 文件 | 3 | 后端相关 toast 提示的构造与展示层：统一解析后端显示名、生成语义化提示文案与 payload，并区分插件托管的本地后端与外部后端。 |
| [src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts](../../../../files/src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts.md) | 文件 | 3 | 本地运行时部署调试对话框：把调试日志条目渲染为可读列表，支持复制单条详情或整段控制台文本，便于排查一键部署失败。 |
| [src/modules/skillRunner/surface/skillRunnerManagementDialog.ts](../../../../files/src/modules/skillRunner/surface/skillRunnerManagementDialog.ts.md) | 文件 | 1 | SkillRunner 管理界面的 URL 构造工具：校验并规范化后端 baseUrl，补齐 /ui 路径，为管理面板提供安全的打开地址。 |
| [src/modules/skillRunner/surface/skillRunnerRunDialog.ts](../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | 文件 | 20 | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [src/modules/skillRunner/surface/skillRunnerSidebarModel.ts](../../../../files/src/modules/skillRunner/surface/skillRunnerSidebarModel.ts.md) | 文件 | 4 | SkillRunner 侧边栏的展示模型：把工作区任务按上下文相关性分组为运行中/已完成/待处理区块，并挑选应默认聚焦的任务键。 |
| [src/modules/skillRunner/surface/skillRunnerSkillDisplayRegistry.ts](../../../../files/src/modules/skillRunner/surface/skillRunnerSkillDisplayRegistry.ts.md) | 文件 | 2 | Skill 展示注册表：保存后端上报的 skill 展示名快照，避免每次渲染都往返后端。 |
| [src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts](../../../../files/src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts.md) | 文件 | 7 | 把 SkillRunner 工作区适配到 Assistant Workspace 共享 surface 契约：把工作区变更映射为发布类型，构造 hint、交互区、控制徽标与 composer 状态，并注册统一的 publication adapter。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/utils](../../utils.md) | 11 |
| [src/modules](../../modules.md) | 7 |
| [src/modules/assistant/publication](../assistant/publication.md) | 7 |
| [src/modules/skillRunner/run](run.md) | 7 |
| [src/backends](../../backends.md) | 6 |
| [src/modules/skillRunner/connection](connection.md) | 4 |
| [src/jobQueue](../../jobQueue.md) | 3 |
| [src/modules/assistant/workspace](../assistant/workspace.md) | 2 |
| [src/modules/workflowExecution](../workflowExecution.md) | 2 |
| [src/providers/skillrunner](../../providers/skillrunner.md) | 2 |
| [src/shared](../../shared.md) | 2 |
| [src/modules/acp/skillRun](../acp/skillRun.md) | 1 |
| [src/modules/hostBridge/permissions](../hostBridge/permissions.md) | 1 |
| [src/modules/skillRunner/runtime](runtime.md) | 1 |
