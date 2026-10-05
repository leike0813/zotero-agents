
# workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs -->

深度阅读结果目标路径推导：把宿主产出的源文件路径映射为 HTML 产物路径，统一处理 Windows/POSIX 路径分隔符与比较用的归一化形式。
源码：[workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs)

## 符号（7）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs:basenamePath -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs:dirnamePath -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs:joinPath -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs:normalizePathForCompare -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs:replaceExtensionAsHtml -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs:resolveDeepReadingHtmlPathFromSourcePath -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs:toNativePath -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| basenamePath | 函数 | 28–33 | 简单 | path-resolution、utility | 0 | 取路径的文件名部分，兼容两种分隔符。 |
| dirnamePath | 函数 | 13–26 | 简单 | path-resolution、utility | 0 | 取路径的父目录部分，兼容两种分隔符且不依赖 Node 的 path 模块。 |
| joinPath | 函数 | 35–46 | 简单 | path-resolution、utility | 0 | 用正斜杠拼接相对路径片段，插件沙箱内不依赖 Node path.join。 |
| normalizePathForCompare | 函数 | 68–74 | 简单 | path-resolution、utility | 0 | 归一化路径用于相等比较，抹平分隔符差异与首尾空白。 |
| replaceExtensionAsHtml | 函数 | 48–57 | 简单 | path-resolution、utility | 0 | 把文件名扩展名替换为 .html，保留目录与主干名。 |
| resolveDeepReadingHtmlPathFromSourcePath | 函数 | 59–66 | 简单 | path-resolution、deep-reading | 0 | 由源文件路径推导对应的 HTML 结果产物路径，扩展名替换为 .html。 |
| toNativePath | 函数 | 5–11 | 简单 | path-resolution、cross-platform | 0 | 把正斜杠路径转为 Windows 原生反斜杠形式，非 Windows 路径原样返回。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../literature-deep-reading/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs | 深度阅读工作流的结果回写 hook：读取深读产物并写入目标笔记或附件，按既有翻译对齐结果决定更新路径。 |
| [translatorArtifacts.mjs](translatorArtifacts.mjs.md) | workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs | 翻译工作流产物模块：确定译文与对齐结果的落盘路径、校验对齐 JSON 合法性，并把译文物化为 Zotero 附件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| basenamePath | 函数 | 28–33 | 取路径的文件名部分，兼容两种分隔符。 |
| dirnamePath | 函数 | 13–26 | 取路径的父目录部分，兼容两种分隔符且不依赖 Node 的 path 模块。 |
| joinPath | 函数 | 35–46 | 用正斜杠拼接相对路径片段，插件沙箱内不依赖 Node path.join。 |
| normalizePathForCompare | 函数 | 68–74 | 归一化路径用于相等比较，抹平分隔符差异与首尾空白。 |
| replaceExtensionAsHtml | 函数 | 48–57 | 把文件名扩展名替换为 .html，保留目录与主干名。 |
| resolveDeepReadingHtmlPathFromSourcePath | 函数 | 59–66 | 由源文件路径推导对应的 HTML 结果产物路径，扩展名替换为 .html。 |
| toNativePath | 函数 | 5–11 | 把正斜杠路径转为 Windows 原生反斜杠形式，非 Windows 路径原样返回。 |
