
# workflows_builtin/literature-workbench-package/lib/tagCompliance.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/tagCompliance.mjs -->

标签合规性评估模块：对候选标签列表做归一化并逐项判定是否符合受控词表约束。
源码：[workflows_builtin/literature-workbench-package/lib/tagCompliance.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/tagCompliance.mjs)

## 符号（2）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/tagCompliance.mjs:evaluateTagCompliance -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/tagCompliance.mjs:normalizeTagList -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| evaluateTagCompliance | 函数 | 13–21 | 简单 | validation、tag-vocabulary、compliance | 1 | 把候选标签与受控词表比对，输出合规标签、越界标签与原因说明。 |
| normalizeTagList | 函数 | 1–11 | 简单 | normalization、tag-vocabulary、utility | 0 | 归一化标签数组：去空白、去重、保持原有顺序并剔除空串。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../tag-auditor/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/tag-auditor/hooks/applyResult.mjs | 标签审计工作流的结果回写 hook：对目标条目的标签做合规性评估，把不合规项作为诊断回传给结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| evaluateTagCompliance | 函数 | 13–21 | 把候选标签与受控词表比对，输出合规标签、越界标签与原因说明。 |
