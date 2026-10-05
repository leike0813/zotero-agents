
# workflows_builtin/literature-workbench-package/add-digest-representative-image/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/add-digest-representative-image/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/add-digest-representative-image/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/add-digest-representative-image/hooks/applyResult.mjs -->

为 digest 笔记补写代表图的 applyResult hook：把用户选定的 Markdown 附件中的图片定位出来，校验目标路径后写入 digest 笔记的代表图区块。
源码：[workflows_builtin/literature-workbench-package/add-digest-representative-image/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/add-digest-representative-image/hooks/applyResult.mjs)

## 符号（4）
<!-- node: function:workflows_builtin/literature-workbench-package/add-digest-representative-image/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/add-digest-representative-image/hooks/applyResult.mjs:applyResultImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/add-digest-representative-image/hooks/applyResult.mjs:collectParentMarkdownAttachments -->
<!-- node: function:workflows_builtin/literature-workbench-package/add-digest-representative-image/hooks/applyResult.mjs:resolveSourcePath -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 217–219 | 简单 | hook、entry-point | 0 | hook 入口，在 package runtime scope 内执行代表图补写并返回应用结果。 |
| applyResultImpl | 函数 | 153–215 | 中等 | hook、digest、image-handling | 0 | 代表图补写主流程：解析选区、定位源图、准备附件与诊断块，再 upsert 到 digest 笔记。 |
| collectParentMarkdownAttachments | 函数 | 44–69 | 简单 | utility、attachment、selection | 0 | 从父条目上枚举所有 Markdown 附件，供用户按 key 挑选代表图来源。 |
| resolveSourcePath | 函数 | 71–115 | 中等 | utility、path-resolution、attachment | 0 | 按附件 key 解析出实际磁盘路径，兼容 Markdown 内嵌图片与外链两种来源。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureDigestNotes.mjs](../../lib/literatureDigestNotes.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs | 生成类笔记（digest、引用分析、文献评分等）的写入与导出核心：分类收集既有笔记、upsert 生成内容、准备代表图，并提供自定义笔记与 conversation 笔记的创建能力。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 217–219 | hook 入口，在 package runtime scope 内执行代表图补写并返回应用结果。 |
