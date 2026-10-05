
# workflows_builtin/literature-workbench-package/collection-collector/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/collection-collector/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/collection-collector/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/collection-collector/hooks/applyResult.mjs -->

collection-collector 工作流的 applyResult hook：按收录阈值把 Agent 输出的论文 ref 列表与当前 Zotero 分类中的条目做匹配，产出纳入/排除结果。
源码：[workflows_builtin/literature-workbench-package/collection-collector/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/collection-collector/hooks/applyResult.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/literature-workbench-package/collection-collector/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/collection-collector/hooks/applyResult.mjs:listCurrentCollectionMembers -->
<!-- node: function:workflows_builtin/literature-workbench-package/collection-collector/hooks/applyResult.mjs:normalizeSelectedItems -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 131–189 | 中等 | hook、entry-point、collection | 0 | hook 入口，读取运行参数中的收录阈值与选中条目，计算 collection 收集结果。 |
| listCurrentCollectionMembers | 函数 | 87–116 | 简单 | utility、collection、pagination | 0 | 通过 hostApi 分页读取当前分类的顶层常规条目成员，作为匹配候选集。 |
| normalizeSelectedItems | 函数 | 38–69 | 简单 | utility、normalization、selection | 0 | 把 runResult 中混杂的条目规格归一化为稳定的父条目 ref 列表。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 131–189 | hook 入口，读取运行参数中的收录阈值与选中条目，计算 collection 收集结果。 |
