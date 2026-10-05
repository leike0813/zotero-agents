
# workflows_builtin/literature-workbench-package/tag-regulator/hooks
> 目录聚合页：2 个文件、25 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs](../../../../files/workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs.md) | 文件 | 23 | 标签治理工作流的核心 hook（约 2000 行）：构建建议标签交互式对话框，接收人工决策后把建议并入受控词表或暂存区，提交受控词表并落盘标签变更。 |
| [workflows_builtin/literature-workbench-package/tag-regulator/hooks/buildRequest.mjs](../../../../files/workflows_builtin/literature-workbench-package/tag-regulator/hooks/buildRequest.mjs.md) | 文件 | 2 | 标签治理工作流的请求构建 hook：委托 lib/tagRegulatorRequest 组装独立请求，本文件只负责 runtime scope 包装与错误归一化。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [workflows_builtin/literature-workbench-package/lib](../lib.md) | 6 |
