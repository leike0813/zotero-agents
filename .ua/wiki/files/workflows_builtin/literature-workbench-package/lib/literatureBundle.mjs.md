
# workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs -->

文献工作台的核心 bundle 库（2600+ 行）：负责可移植笔记 HTML 编解码、bundle/product 清单构建与文件校验、bundle 导出、legacy 迁移确认，以及 bundle/product/research 三类归档的导入。
源码：[workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs)

## 符号（13）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:assertLiteratureBundleImportSucceeded -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:buildLiteratureBundleExport -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:buildLiteratureProduct -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:exportLiteratureBundle -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:importLiteratureBundle -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:importLiteratureBundleArchive -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:importLiteratureProductArchive -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:importResearchProductArchive -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:makePortableNoteHtml -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:restorePortableNoteHtml -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:validateLiteratureBundleManifest -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:validateLiteratureProductManifest -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs:verifyLiteratureBundleFiles -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertLiteratureBundleImportSucceeded | 函数 | 2679–2701 | 简单 | validation、import | 0 | 断言导入 receipt 成功，否则抛出携带失败明细的错误。 |
| buildLiteratureBundleExport | 函数 | 561–787 | 复杂 | export、bundle、builder | 0 | 按条目集合构建完整 bundle 导出内容：可移植笔记 HTML、附件字节与 manifest 条目。 |
| buildLiteratureProduct | 函数 | 833–1018 | 复杂 | export、builder、product | 0 | 构建单条文献产品（笔记 + 附件 + 参考文献）作为 bundle 的最小单元。 |
| [exportLiteratureBundle](../../../../symbols/workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs/exportLiteratureBundle.md) | 函数 | 1256–1362 | 复杂 | export、bundle、orchestration | 1 | 导出主入口：解析选区、构建 bundle 目录树、写出附件与清单，并返回导出 receipt。 |
| [importLiteratureBundle](../../../../symbols/workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs/importLiteratureBundle.md) | 函数 | 2579–2677 | 复杂 | import、bundle、orchestration | 1 | bundle 导入主入口：解压归档、校验清单、匹配库内父条目并写入笔记与附件。 |
| importLiteratureBundleArchive | 函数 | 2036–2237 | 复杂 | import、bundle、archive | 0 | 从归档字节解析并校验 bundle 清单，兼容 legacy 标记并驱动迁移确认流程。 |
| importLiteratureProductArchive | 函数 | 2239–2284 | 中等 | import、archive、product | 0 | 导入单个文献产品归档，用于局部补齐缺失条目。 |
| importResearchProductArchive | 函数 | 2383–2513 | 复杂 | import、archive、research | 0 | 导入研究产品归档，把选区清单与研究产物还原为可移植条目集合。 |
| makePortableNoteHtml | 函数 | 67–89 | 简单 | serialization、html、portable | 0 | 把笔记 HTML 转换为可移植形式，剥离宿主专有属性与绝对路径引用。 |
| restorePortableNoteHtml | 函数 | 91–108 | 简单 | serialization、html、portable | 0 | 把可移植笔记 HTML 还原为宿主可写的托管笔记格式。 |
| validateLiteratureBundleManifest | 函数 | 157–211 | 中等 | validation、bundle、manifest | 0 | 校验 bundle manifest 结构、schema 版本与条目完整性，是导入的第一道闸门。 |
| validateLiteratureProductManifest | 函数 | 448–522 | 复杂 | validation、product、manifest | 0 | 校验文献产品 manifest 的条目 ID 唯一性、路径安全与必需字段。 |
| verifyLiteratureBundleFiles | 函数 | 213–229 | 简单 | validation、bundle | 0 | 逐条核对 manifest 声明的文件是否真实存在且大小匹配。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../import-notes/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs | import-notes 工作流的核心 applyResult hook（1400+ 行）：解析 Agent 产出的 digest、引用分析、参考文献与评分工件，经校验、冲突检测、交互式选择/编辑器后写入 Zotero 笔记，并驱动 Synthesis sidecar 应用。 |
| [bundleBibliography.mjs](bundleBibliography.mjs.md) | workflows_builtin/literature-workbench-package/lib/bundleBibliography.mjs | 为文献 bundle 生成 Better BibTeX 格式参考文献：按物化条目集合请求宿主导出，并在无条目时返回结构化未生成原因。 |
| [embeddedPayloadAttachments.mjs](embeddedPayloadAttachments.mjs.md) | workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs | 笔记内嵌 payload 工件的二进制编解码层：把 payload 打成带 CRC 的 PNG 块塞进笔记附件，并在导入时按标记解析还原原始字节。 |
| [importSchemas.mjs](importSchemas.mjs.md) | workflows_builtin/literature-workbench-package/lib/importSchemas.mjs | 导入产物的 schema 门面：把生成的 ajv 校验器包装成返回 { valid, errors } 的形式，并提供 references/citation/score 工件的解析入口。 |
| [markdownLocalImages.mjs](markdownLocalImages.mjs.md) | workflows_builtin/literature-workbench-package/lib/markdownLocalImages.mjs | 把 Markdown 中的本地图片引用改写为 bundle 内相对路径，并把图片字节一并搬运到导出目录，是 bundle 跨机可移植的关键一步。 |
| [path.mjs](path.mjs.md) | workflows_builtin/literature-workbench-package/lib/path.mjs | 文献工作台工作流包的跨平台路径工具模块，提供 POSIX/Windows 双风格路径拼接、basename 提取与文件名片段净化。 |
| [researchBundle.mjs](researchBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/researchBundle.mjs | 研究产物包（research product）的 schema 定义、选文归一化与打包物化模块：把 Agent 输出的研究选题与论文清单编译成可导出的 bundle。 |
| [runtime.mjs](runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../export-literature-bundle/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/export-literature-bundle/hooks/applyResult.mjs | export-literature-bundle 工作流的 applyResult hook：把选区导出为可移植的文献 bundle（可选 source-only 模式与目标分类）。 |
| [applyResult.mjs](../import-literature-bundle/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/import-literature-bundle/hooks/applyResult.mjs | import-literature-bundle 工作流的 applyResult hook：把已选择的文献 bundle 归档导入 Zotero 库，并断言导入结果成功。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertLiteratureBundleImportSucceeded | 函数 | 2679–2701 | 断言导入 receipt 成功，否则抛出携带失败明细的错误。 |
| buildLiteratureProduct | 函数 | 833–1018 | 构建单条文献产品（笔记 + 附件 + 参考文献）作为 bundle 的最小单元。 |
| [exportLiteratureBundle](../../../../symbols/workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs/exportLiteratureBundle.md) | 函数 | 1256–1362 | 导出主入口：解析选区、构建 bundle 目录树、写出附件与清单，并返回导出 receipt。 |
| [importLiteratureBundle](../../../../symbols/workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs/importLiteratureBundle.md) | 函数 | 2579–2677 | bundle 导入主入口：解压归档、校验清单、匹配库内父条目并写入笔记与附件。 |
| importLiteratureBundleArchive | 函数 | 2036–2237 | 从归档字节解析并校验 bundle 清单，兼容 legacy 标记并驱动迁移确认流程。 |
| importLiteratureProductArchive | 函数 | 2239–2284 | 导入单个文献产品归档，用于局部补齐缺失条目。 |
| importResearchProductArchive | 函数 | 2383–2513 | 导入研究产品归档，把选区清单与研究产物还原为可移植条目集合。 |
| makePortableNoteHtml | 函数 | 67–89 | 把笔记 HTML 转换为可移植形式，剥离宿主专有属性与绝对路径引用。 |
| restorePortableNoteHtml | 函数 | 91–108 | 把可移植笔记 HTML 还原为宿主可写的托管笔记格式。 |
| validateLiteratureBundleManifest | 函数 | 157–211 | 校验 bundle manifest 结构、schema 版本与条目完整性，是导入的第一道闸门。 |
| validateLiteratureProductManifest | 函数 | 448–522 | 校验文献产品 manifest 的条目 ID 唯一性、路径安全与必需字段。 |
| verifyLiteratureBundleFiles | 函数 | 213–229 | 逐条核对 manifest 声明的文件是否真实存在且大小匹配。 |
