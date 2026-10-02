
# joinPath
<!-- node: function:workflows_builtin/literature-workbench-package/lib/path.mjs:joinPath -->

按宿主平台选择分隔符拼接路径片段，忽略空片段并保留盘符/根前缀。
类型：函数  
复杂度：简单  
入边数：3  
标签：utility、path-handling、cross-platform  
所属文件：[workflows_builtin/literature-workbench-package/lib/path.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/path.mjs.md)
源码：[workflows_builtin/literature-workbench-package/lib/path.mjs:1](../../../../../../../workflows_builtin/literature-workbench-package/lib/path.mjs#L1)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../../../../../files/workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs:— | 调试专用 hook：用内嵌的固定 base64 PNG 在本地构造测试 digest 笔记，用于在没有真实文献源时验证 digest 应用链路。 |
| [applyResult.mjs](../../../../../files/workflows_builtin/literature-workbench-package/export-notes/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/export-notes/hooks/applyResult.mjs:— | export-notes 工作流的 applyResult hook：把选中的生成笔记（digest、引用分析、评分等）逐个导出为文件，支持文本、字节与源文件复制三种载荷。 |
| [literatureDeepReadingBundle.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs:— | 深度阅读 source-only bundle 构建器：把宿主产出的 sidecar 工件与 Markdown 内嵌图片重写为可移植相对路径，产出可迁移的 source bundle。 |

## 调用

该符号没有记录对外调用。
