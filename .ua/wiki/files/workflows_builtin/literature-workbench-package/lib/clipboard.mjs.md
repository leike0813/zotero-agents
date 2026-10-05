
# workflows_builtin/literature-workbench-package/lib/clipboard.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/clipboard.mjs -->

剪贴板薄封装：通过 workflow runtime 的 hostApi.clipboard 写文本，失败时返回结构化结果而不抛错。
源码：[workflows_builtin/literature-workbench-package/lib/clipboard.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/clipboard.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/clipboard.mjs:copyTextToClipboard -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| copyTextToClipboard | 函数 | 1–8 | 简单 | clipboard、utility | 1 | 调用 hostApi.clipboard.writeText 写文本，成功返回 method 标识，失败返回 copied:false。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../debug-note-artifact-inspector/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/debug-note-artifact-inspector/hooks/applyResult.mjs | 调试 hook：检查指定笔记的产物完整性，列出缺失/损坏的工件块并尝试复制诊断信息到剪贴板。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| copyTextToClipboard | 函数 | 1–8 | 调用 hostApi.clipboard.writeText 写文本，成功返回 method 标识，失败返回 copied:false。 |
