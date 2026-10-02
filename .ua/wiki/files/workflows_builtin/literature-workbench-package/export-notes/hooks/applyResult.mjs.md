
# workflows_builtin/literature-workbench-package/export-notes/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/export-notes/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/export-notes/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/export-notes/hooks/applyResult.mjs -->

export-notes 工作流的 applyResult hook：把选中的生成笔记（digest、引用分析、评分等）逐个导出为文件，支持文本、字节与源文件复制三种载荷。
源码：[workflows_builtin/literature-workbench-package/export-notes/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/export-notes/hooks/applyResult.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/literature-workbench-package/export-notes/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/export-notes/hooks/applyResult.mjs:applyResultImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/export-notes/hooks/applyResult.mjs:writeExportedFile -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 153–155 | 简单 | hook、entry-point、export | 0 | hook 入口，在 package runtime scope 内执行笔记导出。 |
| applyResultImpl | 函数 | 30–151 | 中等 | export、note、file-io | 0 | 按导出候选列表逐条生成笔记文件、清洗文件名并写入目标目录，同时收集导出警告。 |
| writeExportedFile | 函数 | 5–28 | 简单 | utility、file-io、serialization | 0 | 按导出载荷形态选择 writeText、writeBytes 或文件复制三种写出路径。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureDigestNotes.mjs](../../lib/literatureDigestNotes.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs | 生成类笔记（digest、引用分析、文献评分等）的写入与导出核心：分类收集既有笔记、upsert 生成内容、准备代表图，并提供自定义笔记与 conversation 笔记的创建能力。 |
| [path.mjs](../../lib/path.mjs.md) | workflows_builtin/literature-workbench-package/lib/path.mjs | 文献工作台工作流包的跨平台路径工具模块，提供 POSIX/Windows 双风格路径拼接、basename 提取与文件名片段净化。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 153–155 | hook 入口，在 package runtime scope 内执行笔记导出。 |
