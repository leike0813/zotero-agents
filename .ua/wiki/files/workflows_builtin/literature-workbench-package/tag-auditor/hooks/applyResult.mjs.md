
# workflows_builtin/literature-workbench-package/tag-auditor/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/tag-auditor/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/tag-auditor/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/tag-auditor/hooks/applyResult.mjs -->

标签审计工作流的结果回写 hook：对目标条目的标签做合规性评估，把不合规项作为诊断回传给结果。
源码：[workflows_builtin/literature-workbench-package/tag-auditor/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/tag-auditor/hooks/applyResult.mjs)

## 符号（2）
<!-- node: function:workflows_builtin/literature-workbench-package/tag-auditor/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-auditor/hooks/applyResult.mjs:applyResultImpl -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 55–57 | 简单 | workflow-hook、entry-point、tag-vocabulary | 0 | applyResult 公开入口，在包级 runtime scope 内执行审计并返回结构化诊断。 |
| applyResultImpl | 函数 | 4–53 | 中等 | compliance、tag-vocabulary、diagnostics | 0 | 读取目标条目的现有标签并逐项评估合规性，汇总越界标签与修复建议。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |
| [tagCompliance.mjs](../../lib/tagCompliance.mjs.md) | workflows_builtin/literature-workbench-package/lib/tagCompliance.mjs | 标签合规性评估模块：对候选标签列表做归一化并逐项判定是否符合受控词表约束。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 55–57 | applyResult 公开入口，在包级 runtime scope 内执行审计并返回结构化诊断。 |
