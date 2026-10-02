
# workflows_builtin/literature-workbench-package/export-literature-bundle/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/export-literature-bundle/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/export-literature-bundle/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/export-literature-bundle/hooks/applyResult.mjs -->

export-literature-bundle 工作流的 applyResult hook：把选区导出为可移植的文献 bundle（可选 source-only 模式与目标分类）。
源码：[workflows_builtin/literature-workbench-package/export-literature-bundle/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/export-literature-bundle/hooks/applyResult.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/literature-workbench-package/export-literature-bundle/hooks/applyResult.mjs:applyResult -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 20–22 | 简单 | hook、entry-point、export | 0 | hook 入口，解析导出参数后委派给 literatureBundle 的 exportLiteratureBundle。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureBundle.mjs](../../lib/literatureBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs | 文献工作台的核心 bundle 库（2600+ 行）：负责可移植笔记 HTML 编解码、bundle/product 清单构建与文件校验、bundle 导出、legacy 迁移确认，以及 bundle/product/research 三类归档的导入。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 20–22 | hook 入口，解析导出参数后委派给 literatureBundle 的 exportLiteratureBundle。 |
