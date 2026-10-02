
# workflows_builtin/literature-workbench-package/lib/statusTransition.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/statusTransition.mjs -->

工作流状态迁移诊断模块：检查结果状态迁移是否合法，并把违规详情收集为可并入结果的诊断项。
源码：[workflows_builtin/literature-workbench-package/lib/statusTransition.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/statusTransition.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/statusTransition.mjs:collectStatusTransitionDiagnostics -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectStatusTransitionDiagnostics | 函数 | 1–20 | 简单 | diagnostics、state-machine、validation | 1 | 比对迁移前后的任务状态，识别非法跳转、回退与缺失终态并返回结构化诊断。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../literature-analysis/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs | 文献分析工作流的结果回写 hook：读取产物 bundle、过滤低质参考文献、写入 digest 与各类子笔记、附带代表图并完成状态迁移与诊断上报。 |
| [applyResult.mjs](../literature-deep-reading/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs | 深度阅读工作流的结果回写 hook：读取深读产物并写入目标笔记或附件，按既有翻译对齐结果决定更新路径。 |
| [applyResult.mjs](../literature-metadata-curator/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs | 元数据策展工作流的结果回写 hook：把策展得到的题录字段写回条目，并清理策展过程产生的临时标记与产物。 |
| [applyResult.mjs](../literature-search-ingest/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-search-ingest/hooks/applyResult.mjs | 检索入库工作流的结果回写 hook：校验 Agent 返回的入库候选，只对处于合法状态迁移的条目执行创建。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| collectStatusTransitionDiagnostics | 函数 | 1–20 | 比对迁移前后的任务状态，识别非法跳转、回退与缺失终态并返回结构化诊断。 |
