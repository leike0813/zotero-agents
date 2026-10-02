
# src/modules/workflow
> 目录聚合页：1 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/workflow/productionExecution.ts](../../../files/src/modules/workflow/productionExecution.ts.md) | 文件 | 0 | 工作流执行各 seam 的生产态依赖装配点，把 Host Bridge 环境构造、Assistant 侧边栏与 SkillRunner 工作区聚焦等真实实现注入 preparation/run/duplicateGuard/submission seam。 |

## 子目录
- [catalog](workflow/catalog.md)、[settings](workflow/settings.md)、[ui](workflow/ui.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules/workflowExecution](workflowExecution.md) | 5 |
| [src/jobQueue](../jobQueue.md) | 1 |
| [src/modules](../modules.md) | 1 |
| [src/modules/assistant/workspace](assistant/workspace.md) | 1 |
| [src/modules/hostBridge/cli](hostBridge/cli.md) | 1 |
| [src/modules/skillRunner/surface](skillRunner/surface.md) | 1 |
