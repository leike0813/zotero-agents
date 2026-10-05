
# workflows_builtin/literature-workbench-package/debug-note-artifact-inspector/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/debug-note-artifact-inspector/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/debug-note-artifact-inspector/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/debug-note-artifact-inspector/hooks/applyResult.mjs -->

调试 hook：检查指定笔记的产物完整性，列出缺失/损坏的工件块并尝试复制诊断信息到剪贴板。
源码：[workflows_builtin/literature-workbench-package/debug-note-artifact-inspector/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/debug-note-artifact-inspector/hooks/applyResult.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/literature-workbench-package/debug-note-artifact-inspector/hooks/applyResult.mjs:analyzeNoteItemForDebug -->
<!-- node: function:workflows_builtin/literature-workbench-package/debug-note-artifact-inspector/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/debug-note-artifact-inspector/hooks/applyResult.mjs:applyResultImpl -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| analyzeNoteItemForDebug | 函数 | 19–79 | 中等 | debug、diagnostics、validation | 0 | 逐块分析笔记内嵌工件，汇总 base64 解码失败、CRC 不匹配等具体损坏原因。 |
| applyResult | 函数 | 152–154 | 简单 | hook、entry-point、debug | 0 | hook 入口，触发病笔记诊断并返回结构化报告。 |
| applyResultImpl | 函数 | 81–150 | 中等 | debug、diagnostics、clipboard | 0 | 驱动诊断流程：分页读笔记、调用分析器，必要时把报告写入剪贴板并给出 toast。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [clipboard.mjs](../../lib/clipboard.mjs.md) | workflows_builtin/literature-workbench-package/lib/clipboard.mjs | 剪贴板薄封装：通过 workflow runtime 的 hostApi.clipboard 写文本，失败时返回结构化结果而不抛错。 |
| [literatureDigestNotes.mjs](../../lib/literatureDigestNotes.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs | 生成类笔记（digest、引用分析、文献评分等）的写入与导出核心：分类收集既有笔记、upsert 生成内容、准备代表图，并提供自定义笔记与 conversation 笔记的创建能力。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| analyzeNoteItemForDebug | 函数 | 19–79 | 逐块分析笔记内嵌工件，汇总 base64 解码失败、CRC 不匹配等具体损坏原因。 |
| applyResult | 函数 | 152–154 | hook 入口，触发病笔记诊断并返回结构化报告。 |
