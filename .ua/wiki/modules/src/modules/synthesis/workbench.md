
# src/modules/synthesis/workbench
> 目录聚合页：2 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/synthesis/workbench/synthesisWorkbenchInvalidation.ts](../../../../files/src/modules/synthesis/workbench/synthesisWorkbenchInvalidation.ts.md) | 文件 | 0 | 工作台失效广播：维护 sidecar 变化监听者集合，把受影响的 Surface 名单、来源引用与原因一次性广播出去，供各区域按自身 signature 决定是否重渲染。 |
| [src/modules/synthesis/workbench/synthesisWorkbenchTab.ts](../../../../files/src/modules/synthesis/workbench/synthesisWorkbenchTab.ts.md) | 文件 | 0 | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](../../modules.md) | 6 |
| [src/modules/synthesis](../synthesis.md) | 4 |
| [src/utils](../../utils.md) | 3 |
| [src/modules/synthesis/sidecar](sidecar.md) | 2 |
| [src/modules/synthesisClient](../synthesisClient.md) | 2 |
| [src/shared](../../shared.md) | 2 |
| [.](../../../index.md) | 1 |
| [packages/synthesis-contracts/src](../../../packages/synthesis-contracts/src.md) | 1 |
| [src](../../../src.md) | 1 |
| [src/modules/synthesis/debug](debug.md) | 1 |
| [src/modules/synthesis/production](production.md) | 1 |
| [src/modules/workflow/catalog](../workflow/catalog.md) | 1 |
| [src/modules/workflow/ui](../workflow/ui.md) | 1 |
| [src/modules/workflowExecution](../workflowExecution.md) | 1 |
