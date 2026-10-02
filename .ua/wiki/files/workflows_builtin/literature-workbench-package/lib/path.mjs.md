
# workflows_builtin/literature-workbench-package/lib/path.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/path.mjs -->

文献工作台工作流包的跨平台路径工具模块，提供 POSIX/Windows 双风格路径拼接、basename 提取与文件名片段净化。
源码：[workflows_builtin/literature-workbench-package/lib/path.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/path.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/path.mjs:getBaseName -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/path.mjs:joinPath -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/path.mjs:sanitizeFileNameSegment -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [getBaseName](../../../../symbols/workflows_builtin/literature-workbench-package/lib/path.mjs/getBaseName.md) | 函数 | 25–31 | 简单 | utility、path-handling、string-manipulation | 3 | 从混合分隔符的路径中取出末段文件名，兼容正斜杠与反斜杠两种写法。 |
| [joinPath](../../../../symbols/workflows_builtin/literature-workbench-package/lib/path.mjs/joinPath.md) | 函数 | 1–23 | 简单 | utility、path-handling、cross-platform | 3 | 按宿主平台选择分隔符拼接路径片段，忽略空片段并保留盘符/根前缀。 |
| sanitizeFileNameSegment | 函数 | 33–44 | 简单 | utility、sanitization、validation | 1 | 把任意字符串收敛为合法文件名片段，剔除路径分隔符与保留字符并限制长度。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../debug-digest-apply-fixture/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs | 调试专用 hook：用内嵌的固定 base64 PNG 在本地构造测试 digest 笔记，用于在没有真实文献源时验证 digest 应用链路。 |
| [applyResult.mjs](../export-notes/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/export-notes/hooks/applyResult.mjs | export-notes 工作流的 applyResult hook：把选中的生成笔记（digest、引用分析、评分等）逐个导出为文件，支持文本、字节与源文件复制三种载荷。 |
| [applyResult.mjs](../import-notes/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs | import-notes 工作流的核心 applyResult hook（1400+ 行）：解析 Agent 产出的 digest、引用分析、参考文献与评分工件，经校验、冲突检测、交互式选择/编辑器后写入 Zotero 笔记，并驱动 Synthesis sidecar 应用。 |
| [applyResult.mjs](../literature-deep-reading/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs | 深度阅读工作流的结果回写 hook：读取深读产物并写入目标笔记或附件，按既有翻译对齐结果决定更新路径。 |
| [literatureBundle.mjs](literatureBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs | 文献工作台的核心 bundle 库（2600+ 行）：负责可移植笔记 HTML 编解码、bundle/product 清单构建与文件校验、bundle 导出、legacy 迁移确认，以及 bundle/product/research 三类归档的导入。 |
| [literatureDeepReadingBundle.mjs](literatureDeepReadingBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs | 深度阅读 source-only bundle 构建器：把宿主产出的 sidecar 工件与 Markdown 内嵌图片重写为可移植相对路径，产出可迁移的 source bundle。 |
| [literatureDigestNotes.mjs](literatureDigestNotes.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs | 生成类笔记（digest、引用分析、文献评分等）的写入与导出核心：分类收集既有笔记、upsert 生成内容、准备代表图，并提供自定义笔记与 conversation 笔记的创建能力。 |
| [markdownLocalImages.mjs](markdownLocalImages.mjs.md) | workflows_builtin/literature-workbench-package/lib/markdownLocalImages.mjs | 把 Markdown 中的本地图片引用改写为 bundle 内相对路径，并把图片字节一并搬运到导出目录，是 bundle 跨机可移植的关键一步。 |
| [translatorArtifacts.mjs](translatorArtifacts.mjs.md) | workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs | 翻译工作流产物模块：确定译文与对齐结果的落盘路径、校验对齐 JSON 合法性，并把译文物化为 Zotero 附件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [getBaseName](../../../../symbols/workflows_builtin/literature-workbench-package/lib/path.mjs/getBaseName.md) | 函数 | 25–31 | 从混合分隔符的路径中取出末段文件名，兼容正斜杠与反斜杠两种写法。 |
| [joinPath](../../../../symbols/workflows_builtin/literature-workbench-package/lib/path.mjs/joinPath.md) | 函数 | 1–23 | 按宿主平台选择分隔符拼接路径片段，忽略空片段并保留盘符/根前缀。 |
| sanitizeFileNameSegment | 函数 | 33–44 | 把任意字符串收敛为合法文件名片段，剔除路径分隔符与保留字符并限制长度。 |
