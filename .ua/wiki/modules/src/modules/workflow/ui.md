
# src/modules/workflow/ui
> 目录聚合页：5 个文件、36 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/workflow/ui/selectionSample.ts](../../../../files/src/modules/workflow/ui/selectionSample.ts.md) | 文件 | 3 | 调试用选区采样工具：在 Zotero 菜单中注册「采样当前选区」入口，读取 Zotero SelectionContext 后写入临时文件，供工作流输入物化问题排查。 |
| [src/modules/workflow/ui/workflowDebugProbe.ts](../../../../files/src/modules/workflow/ui/workflowDebugProbe.ts.md) | 文件 | 5 | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [src/modules/workflow/ui/workflowEditorHost.ts](../../../../files/src/modules/workflow/ui/workflowEditorHost.ts.md) | 文件 | 21 | 工作流编辑器宿主：在 Zotero 窗口中打开内嵌 HTML 编辑器面板，承载工作流节点编辑，并把 legacy 文献产物负载通过迁移转换器升级为现行 schema。 |
| [src/modules/workflow/ui/workflowExecute.ts](../../../../files/src/modules/workflow/ui/workflowExecute.ts.md) | 文件 | 2 | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [src/modules/workflow/ui/workflowMenu.ts](../../../../files/src/modules/workflow/ui/workflowMenu.ts.md) | 文件 | 5 | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/workflows](../../workflows.md) | 13 |
| [src/modules](../../modules.md) | 12 |
| [src/utils](../../utils.md) | 9 |
| [src/modules/workflowExecution](../workflowExecution.md) | 8 |
| [src/modules/workflow/catalog](catalog.md) | 6 |
| [src/modules/workflow/settings](settings.md) | 5 |
| [.](../../../index.md) | 2 |
| [src/backends](../../backends.md) | 1 |
| [src/jobQueue](../../jobQueue.md) | 1 |
| [src/modules/literatureArtifactMigration](../literatureArtifactMigration.md) | 1 |
| [src/modules/skillRunner/connection](../skillRunner/connection.md) | 1 |
| [src/modules/workflow](../workflow.md) | 1 |
| [src/providers](../../providers.md) | 1 |
