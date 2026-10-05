
# parseImportedReferencesArtifact
<!-- node: function:workflows_builtin/literature-workbench-package/lib/importSchemas.mjs:parseImportedReferencesArtifact -->

解析 references 工件文本为对象并同步做 schema 校验。
类型：函数  
复杂度：简单  
入边数：3  
标签：parser、validation、import  
所属文件：[workflows_builtin/literature-workbench-package/lib/importSchemas.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/importSchemas.mjs.md)
源码：[workflows_builtin/literature-workbench-package/lib/importSchemas.mjs:37](../../../../../../../workflows_builtin/literature-workbench-package/lib/importSchemas.mjs#L37)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../../../../../files/workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs:— | import-notes 工作流的核心 applyResult hook（1400+ 行）：解析 Agent 产出的 digest、引用分析、参考文献与评分工件，经校验、冲突检测、交互式选择/编辑器后写入 Zotero 笔记，并驱动 Synthesis sidecar 应用。 |
| [literatureBundle.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:— | 文献工作台的核心 bundle 库（2600+ 行）：负责可移植笔记 HTML 编解码、bundle/product 清单构建与文件校验、bundle 导出、legacy 迁移确认，以及 bundle/product/research 三类归档的导入。 |
| [literatureDeepReadingBundle.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs:— | 深度阅读 source-only bundle 构建器：把宿主产出的 sidecar 工件与 Markdown 内嵌图片重写为可移植相对路径，产出可迁移的 source bundle。 |

## 调用

该符号没有记录对外调用。
