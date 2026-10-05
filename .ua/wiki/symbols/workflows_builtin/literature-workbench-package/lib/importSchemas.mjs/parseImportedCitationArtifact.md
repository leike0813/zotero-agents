
# parseImportedCitationArtifact
<!-- node: function:workflows_builtin/literature-workbench-package/lib/importSchemas.mjs:parseImportedCitationArtifact -->

解析 citation-analysis 工件文本为对象并同步校验。
类型：函数  
复杂度：简单  
入边数：2  
标签：parser、validation、import  
所属文件：[workflows_builtin/literature-workbench-package/lib/importSchemas.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/importSchemas.mjs.md)
源码：[workflows_builtin/literature-workbench-package/lib/importSchemas.mjs:41](../../../../../../../workflows_builtin/literature-workbench-package/lib/importSchemas.mjs#L41)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [literatureBundle.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:— | 文献工作台的核心 bundle 库（2600+ 行）：负责可移植笔记 HTML 编解码、bundle/product 清单构建与文件校验、bundle 导出、legacy 迁移确认，以及 bundle/product/research 三类归档的导入。 |
| [literatureDeepReadingBundle.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs:— | 深度阅读 source-only bundle 构建器：把宿主产出的 sidecar 工件与 Markdown 内嵌图片重写为可移植相对路径，产出可迁移的 source bundle。 |

## 调用

该符号没有记录对外调用。
