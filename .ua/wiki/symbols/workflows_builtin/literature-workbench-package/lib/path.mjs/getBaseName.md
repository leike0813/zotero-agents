
# getBaseName
<!-- node: function:workflows_builtin/literature-workbench-package/lib/path.mjs:getBaseName -->

从混合分隔符的路径中取出末段文件名，兼容正斜杠与反斜杠两种写法。
类型：函数  
复杂度：简单  
入边数：3  
标签：utility、path-handling、string-manipulation  
所属文件：[workflows_builtin/literature-workbench-package/lib/path.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/path.mjs.md)
源码：[workflows_builtin/literature-workbench-package/lib/path.mjs:25](../../../../../../../workflows_builtin/literature-workbench-package/lib/path.mjs#L25)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../../../../../files/workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs:— | import-notes 工作流的核心 applyResult hook（1400+ 行）：解析 Agent 产出的 digest、引用分析、参考文献与评分工件，经校验、冲突检测、交互式选择/编辑器后写入 Zotero 笔记，并驱动 Synthesis sidecar 应用。 |
| [literatureDigestNotes.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs:— | 生成类笔记（digest、引用分析、文献评分等）的写入与导出核心：分类收集既有笔记、upsert 生成内容、准备代表图，并提供自定义笔记与 conversation 笔记的创建能力。 |
| [markdownLocalImages.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/markdownLocalImages.mjs.md) | workflows_builtin/literature-workbench-package/lib/markdownLocalImages.mjs:— | 把 Markdown 中的本地图片引用改写为 bundle 内相对路径，并把图片字节一并搬运到导出目录，是 bundle 跨机可移植的关键一步。 |

## 调用

该符号没有记录对外调用。
