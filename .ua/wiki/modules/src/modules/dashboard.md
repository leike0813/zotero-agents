
# src/modules/dashboard
> 目录聚合页：4 个文件、32 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/dashboard/dashboardActions.ts](../../../files/src/modules/dashboard/dashboardActions.ts.md) | 文件 | 6 | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [src/modules/dashboard/dashboardFrame.ts](../../../files/src/modules/dashboard/dashboardFrame.ts.md) | 文件 | 3 | Dashboard 页面框架 owner：创建 content browser 与 frame，登记挂载句柄并在卸载时移除 frame。 |
| [src/modules/dashboard/dashboardRuntime.ts](../../../files/src/modules/dashboard/dashboardRuntime.ts.md) | 文件 | 2 | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [src/modules/dashboard/dashboardSnapshot.ts](../../../files/src/modules/dashboard/dashboardSnapshot.ts.md) | 文件 | 21 | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](../modules.md) | 19 |
| [src/backends](../backends.md) | 7 |
| [src/modules/workflow/catalog](workflow/catalog.md) | 7 |
| [src/modules/acp/skillRun](acp/skillRun.md) | 6 |
| [src/modules/workflow/settings](workflow/settings.md) | 6 |
| [src/utils](../utils.md) | 5 |
| [src/jobQueue](../jobQueue.md) | 4 |
| [src/modules/skillRunner/run](skillRunner/run.md) | 4 |
| [src/shared](../shared.md) | 4 |
| [src/modules/skillRunner/connection](skillRunner/connection.md) | 3 |
| [.](../../index.md) | 2 |
| [src/config](../config.md) | 2 |
| [src/modules/skillRunner/surface](skillRunner/surface.md) | 2 |
| [src/providers/skillrunner](../providers/skillrunner.md) | 2 |
| [src/workflows](../workflows.md) | 2 |
| [src/modules/assistant/workspace](assistant/workspace.md) | 1 |
| [src/modules/workflow/ui](workflow/ui.md) | 1 |
| [src/platform](../platform.md) | 1 |
