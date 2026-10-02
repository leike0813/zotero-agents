
# workflows_builtin/literature-workbench-package/lib/markdownLocalImages.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/markdownLocalImages.mjs -->

把 Markdown 中的本地图片引用改写为 bundle 内相对路径，并把图片字节一并搬运到导出目录，是 bundle 跨机可移植的关键一步。
源码：[workflows_builtin/literature-workbench-package/lib/markdownLocalImages.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/markdownLocalImages.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/markdownLocalImages.mjs:joinLocalPath -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/markdownLocalImages.mjs:localDestinationPath -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/markdownLocalImages.mjs:rewriteMarkdownLocalImages -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| joinLocalPath | 函数 | 26–47 | 简单 | path-resolution、utility | 0 | 按 base64/data URI/相对路径三种来源拼出图片的可用本地位置。 |
| localDestinationPath | 函数 | 54–78 | 简单 | path-resolution、security | 0 | 计算图片在 bundle 内的目标相对路径，对文件名做清洗并避免目录穿越。 |
| rewriteMarkdownLocalImages | 函数 | 110–178 | 中等 | markdown、portable、rewriting | 1 | 重写 Markdown 中的本地图片链接为目标目录相对路径，并登记需搬运的图片条目。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.mjs](path.mjs.md) | workflows_builtin/literature-workbench-package/lib/path.mjs | 文献工作台工作流包的跨平台路径工具模块，提供 POSIX/Windows 双风格路径拼接、basename 提取与文件名片段净化。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureBundle.mjs](literatureBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs | 文献工作台的核心 bundle 库（2600+ 行）：负责可移植笔记 HTML 编解码、bundle/product 清单构建与文件校验、bundle 导出、legacy 迁移确认，以及 bundle/product/research 三类归档的导入。 |
| [researchBundle.mjs](researchBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/researchBundle.mjs | 研究产物包（research product）的 schema 定义、选文归一化与打包物化模块：把 Agent 输出的研究选题与论文清单编译成可导出的 bundle。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rewriteMarkdownLocalImages | 函数 | 110–178 | 重写 Markdown 中的本地图片链接为目标目录相对路径，并登记需搬运的图片条目。 |
