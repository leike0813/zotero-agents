
# workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks
> 目录聚合页：3 个文件、13 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs](../../../../files/workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs.md) | 文件 | 7 | 元数据策展工作流的结果回写 hook：把策展得到的题录字段写回条目，并清理策展过程产生的临时标记与产物。 |
| [workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/buildRequest.mjs](../../../../files/workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/buildRequest.mjs.md) | 文件 | 3 | 元数据策展工作流的请求构建 hook：解析任务名与元数据请求参数，组装供 Agent 补全题录的请求。 |
| [workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/preflight.mjs](../../../../files/workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/preflight.mjs.md) | 文件 | 3 | 元数据策展工作流的 preflight hook：解析条目标识符、在受控数据源中查找权威题录，并给出可执行状态供 UI 展示。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [workflows_builtin/literature-workbench-package/lib](../lib.md) | 7 |
