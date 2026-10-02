
# workflows_builtin/literature-workbench-package/import-literature-bundle/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/import-literature-bundle/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/import-literature-bundle/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/import-literature-bundle/hooks/applyResult.mjs -->

import-literature-bundle 工作流的 applyResult hook：把已选择的文献 bundle 归档导入 Zotero 库，并断言导入结果成功。
源码：[workflows_builtin/literature-workbench-package/import-literature-bundle/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/import-literature-bundle/hooks/applyResult.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/literature-workbench-package/import-literature-bundle/hooks/applyResult.mjs:applyResult -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 13–15 | 简单 | hook、entry-point、import | 0 | hook 入口，委派 literatureBundle 导入并对返回结果做成功断言。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureBundle.mjs](../../lib/literatureBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs | 文献工作台的核心 bundle 库（2600+ 行）：负责可移植笔记 HTML 编解码、bundle/product 清单构建与文件校验、bundle 导出、legacy 迁移确认，以及 bundle/product/research 三类归档的导入。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 13–15 | hook 入口，委派 literatureBundle 导入并对返回结果做成功断言。 |
